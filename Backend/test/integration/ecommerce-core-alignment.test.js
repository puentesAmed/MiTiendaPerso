import test, { after, before, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import jwt from "jsonwebtoken";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { env } from "../../src/config/env.js";
import { Product } from "../../src/models/Product.js";
import { Coupon } from "../../src/models/Coupon.js";
import { Order } from "../../src/models/Order.js";
import { emailTransporter } from "../../src/services/email.service.js";
import { clearPaymentSettingsCache } from "../../src/services/payment-settings.service.js";
import { calculateShippingQuote, clearShippingDistanceCache } from "../../src/services/shipping.service.js";
import { prefersReducedMotion } from "../../../frontend/src/utils/cartAnimation.js";
import { clearTestDB, setupTestDB, teardownTestDB } from "../setup/test-db.js";

const app = createApp();
const emailMock = mock.method(emailTransporter, "sendMail", async () => ({ accepted: [] }));
const address = { fullName: "Cliente", street: "Calle 1", city: "Madrid", state: "Madrid", postalCode: "28001", country: "España" };

before(setupTestDB);
beforeEach(async () => { await clearTestDB(); clearPaymentSettingsCache(); clearShippingDistanceCache(); });
after(async () => { emailMock.mock.restore(); await teardownTestDB(); });

test("runtime público conserva solo Designer V2 y checkout guest", () => {
  const router = fs.readFileSync(new URL("../../../frontend/src/router/index.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(router, /personalizar\/:id|ProductDesignerPage\.jsx/);
  assert.match(router, /path: "personalizar-v2\/:productId"/);
  assert.ok(router.indexOf('path: "checkout"') < router.indexOf("element: <ProtectedRoute />"));
});

test("feedback de carrito respeta reduced motion", () => {
  const previousWindow = globalThis.window;
  globalThis.window = { matchMedia: () => ({ matches: true }) };
  assert.equal(prefersReducedMotion(), true);
  globalThis.window = previousWindow;
});

test("cupón válido modifica total autoritativo y queda congelado en el pedido", async () => {
  const product = await Product.create({ name: "Producto", price: 50, stock: 5, active: true });
  await Coupon.create({ code: "AHORRA10", percentOff: 10, enabled: true });
  const response = await request(app).post("/api/orders").send({
    guestId: "guest-coupon", email: "coupon@test.com", paymentMethod: "bizum",
    customer: { fullName: "Cliente Cupón", email: "coupon@test.com", phone: "+34 600 123 123" }, termsAccepted: true,
    items: [{ productId: product._id, quantity: 1 }], shippingAddress: address,
    couponCode: "ahorra10",
  });
  assert.equal(response.status, 201, JSON.stringify(response.body));
  assert.equal(response.body.order.subtotal, 50);
  assert.equal(response.body.order.discountAmount, 5);
  assert.equal(response.body.order.total, 50.99);
  assert.equal(response.body.order.coupon.code, "AHORRA10");
  assert.equal(response.body.order.payment.instructionsSnapshot.recipient, env.MANUAL_PAYMENTS.bizum.recipient);
  assert.equal((await Coupon.findOne({ code: "AHORRA10" })).usageCount, 1);
});

test("PRIMER10 se rechaza cuando la identidad ya tiene un pedido", async () => {
  const product = await Product.create({ name: "Producto", price: 20, stock: 5, active: true });
  await Coupon.create({ code: "PRIMER10", percentOff: 10, enabled: true, firstOrderOnly: true });
  await Order.create({ guestId: "old", guestEmail: "repeat@test.com", items: [{ productId: product._id, name: "Producto", quantity: 1, price: 20 }], total: 25.99, shipping: { zone: "peninsula", price: 5.99, estimatedDays: { min: 2, max: 3 }, estimatedDeliveryDate: new Date() }, shippingAddress: address });
  const response = await request(app).post("/api/coupons/validate").send({ code: "PRIMER10", email: "repeat@test.com", items: [{ productId: product._id, quantity: 1 }] });
  assert.equal(response.status, 400);
  assert.match(response.body.message, /primer pedido/);
});

test("Admin persiste métodos y pedidos conservan snapshot", async () => {
  const token = jwt.sign({ sub: "507f1f77bcf86cd799439011", role: "admin", email: "admin@test.com" }, env.JWT_SECRET);
  const update = await request(app).put("/api/payments/admin/settings").set("Authorization", `Bearer ${token}`).send({ bizum: { enabled: true, label: "Bizum", recipient: "600000000", instructions: "Usa la referencia" }, bankTransfer: { enabled: false, label: "Transferencia bancaria" } });
  assert.equal(update.status, 200, JSON.stringify(update.body));
  const methods = await request(app).get("/api/payments/manual/methods");
  assert.deepEqual(methods.body.methods.map((method) => method.id), ["bizum"]);
});

test("envío por distancia usa bandas y hace fallback zonal", async () => {
  const config = { enabled: true, bands: [{ maxKm: 10, basePrice: 3, freeFrom: null, estimatedDays: { min: 1, max: 1 } }] };
  const distance = await calculateShippingQuote({ authoritativeSubtotal: 10, shippingAddress: address }, { distanceConfig: config, distanceProvider: async () => 5 });
  assert.equal(distance.price, 3);
  assert.equal(distance.source, "distance");
  const fallback = await calculateShippingQuote({ authoritativeSubtotal: 10, shippingAddress: address }, { distanceConfig: config, distanceProvider: async () => { throw new Error("offline"); } });
  assert.equal(fallback.price, 5.99);
  assert.equal(fallback.source, "zone-fallback");
});
