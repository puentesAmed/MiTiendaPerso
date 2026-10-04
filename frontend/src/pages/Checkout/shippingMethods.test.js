import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildSelectedShippingQuote, buildShippingQuoteRequestKey, isDeliveryAddressReady, isShippingMethodSelectable, normalizeDeliveryAddress, selectShippingMethodId, SHIPPING_REASON_LABELS } from "./shippingMethods.js";

const methods = [
  { methodId: "pickup-free", available: true, quote: { amount: 0, total: 40, estimatedDays: null, isFree: true } },
  { methodId: "local-urgent", available: true, quote: { amount: 8.5, total: 48.5, estimatedDays: { min: 1, max: 1 } } },
  { methodId: "parcel-standard", available: false, reason: "rates_not_configured" },
];

test("selecciona solo métodos disponibles y conserva selección válida", () => {
  assert.equal(selectShippingMethodId(methods), "pickup-free");
  assert.equal(selectShippingMethodId(methods, "parcel-standard"), "pickup-free");
  assert.equal(selectShippingMethodId(methods, "local-urgent"), "local-urgent");
  assert.equal(selectShippingMethodId(methods.map((method) => ({ ...method, available: false }))), "");
  const pendingLocal = { methodId: "local-urgent", enabled: true, available: false, reason: "invalid_address" };
  assert.equal(isShippingMethodSelectable(pendingLocal), true);
  assert.equal(selectShippingMethodId([pendingLocal]), "local-urgent");
});

test("normaliza y deduplica dirección antes de cotizar", () => {
  const address = { fullName: " Cliente ", street: " Calle   Uno 1 ", postalCode: " 28001 ", city: " Madrid ", state: " Madrid ", country: " España " };
  const normalized = normalizeDeliveryAddress(address);
  assert.equal(normalized.street, "Calle Uno 1");
  assert.equal(isDeliveryAddressReady(normalized), true);
  assert.equal(isDeliveryAddressReady({ ...normalized, postalCode: "2" }), false);
  const input = { items: [{ productId: "p1", quantity: 1 }], methodId: "local-urgent", couponCode: "", email: "", address };
  assert.equal(buildShippingQuoteRequestKey(input), buildShippingQuoteRequestKey({ ...input, address: normalized }));
  assert.equal(buildShippingQuoteRequestKey({ ...input, methodId: "pickup-free" }), buildShippingQuoteRequestKey({ ...input, methodId: "pickup-free", address: null }));
});

test("adapta método seleccionado al resumen sin confiar en amount del cliente", () => {
  assert.deepEqual(buildSelectedShippingQuote(methods, { subtotal: 45, discountAmount: 5, coupon: { code: "TEST" } }, "local-urgent"), {
    amount: 8.5, price: 8.5, total: 48.5, estimatedDays: { min: 1, max: 1 }, subtotal: 45, discountAmount: 5, coupon: { code: "TEST" },
  });
  assert.equal(buildSelectedShippingQuote(methods, { subtotal: 45 }, "parcel-standard"), null);
  assert.equal(buildSelectedShippingQuote(methods, { subtotal: 40, discountAmount: 0, coupon: null }, "pickup-free").total, 40);
  assert.equal(buildSelectedShippingQuote(methods, { subtotal: 40, discountAmount: 0, coupon: null }, "pickup-free").price, 0);
  assert.match(SHIPPING_REASON_LABELS.rates_not_configured, /Tarifas/);
});

test("Checkout envía solo el método seleccionado y renderiza indisponibilidad", () => {
  const checkout = readFileSync(new URL("./Checkout.jsx", import.meta.url), "utf8");
  const ordersService = readFileSync(new URL("../../services/orders.service.js", import.meta.url), "utf8");
  assert.match(checkout, /ShippingMethods/);
  assert.match(checkout, /No hay ningún método de envío disponible/);
  assert.match(checkout, /Preparación del pedido/);
  assert.match(checkout, /Recogida disponible cuando el pedido esté preparado/);
  assert.match(checkout, /Distancia:/);
  assert.match(checkout, /Tarifa zonal de respaldo; distancia no disponible/);
  assert.match(checkout, /window\.setTimeout\(fetchQuote, requiresDeliveryAddress \? 800 : 0\)/);
  assert.match(checkout, /controller\.abort\(\)/);
  assert.match(checkout, /lastShippingQuoteKeyRef/);
  assert.match(checkout, /shippingMethodId && shippingMethodId !== "pickup-free"/);
  assert.doesNotMatch(checkout, />Plazo estimado</);
  assert.match(ordersService, /shippingMethodId: data\.shippingMethodId/);
  assert.doesNotMatch(ordersService, /shippingAmount|shippingPrice/);
});
