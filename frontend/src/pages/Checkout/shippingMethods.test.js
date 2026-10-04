import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildSelectedShippingQuote, selectShippingMethodId, SHIPPING_REASON_LABELS } from "./shippingMethods.js";

const methods = [
  { methodId: "local-urgent", available: true, quote: { amount: 8.5, total: 48.5, estimatedDays: { min: 1, max: 1 } } },
  { methodId: "parcel-standard", available: false, reason: "rates_not_configured" },
];

test("selecciona solo métodos disponibles y conserva selección válida", () => {
  assert.equal(selectShippingMethodId(methods), "local-urgent");
  assert.equal(selectShippingMethodId(methods, "parcel-standard"), "local-urgent");
  assert.equal(selectShippingMethodId(methods, "local-urgent"), "local-urgent");
  assert.equal(selectShippingMethodId(methods.map((method) => ({ ...method, available: false }))), "");
});

test("adapta método seleccionado al resumen sin confiar en amount del cliente", () => {
  assert.deepEqual(buildSelectedShippingQuote(methods, { subtotal: 45, discountAmount: 5, coupon: { code: "TEST" } }, "local-urgent"), {
    amount: 8.5, price: 8.5, total: 48.5, estimatedDays: { min: 1, max: 1 }, subtotal: 45, discountAmount: 5, coupon: { code: "TEST" },
  });
  assert.equal(buildSelectedShippingQuote(methods, { subtotal: 45 }, "parcel-standard"), null);
  assert.match(SHIPPING_REASON_LABELS.rates_not_configured, /Tarifas/);
});

test("Checkout envía solo el método seleccionado y renderiza indisponibilidad", () => {
  const checkout = readFileSync(new URL("./Checkout.jsx", import.meta.url), "utf8");
  const ordersService = readFileSync(new URL("../../services/orders.service.js", import.meta.url), "utf8");
  assert.match(checkout, /ShippingMethods/);
  assert.match(checkout, /No hay ningún método de envío disponible/);
  assert.match(ordersService, /shippingMethodId: data\.shippingMethodId/);
  assert.doesNotMatch(ordersService, /shippingAmount|shippingPrice/);
});
