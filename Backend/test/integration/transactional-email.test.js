import test, { before, beforeEach, after, mock } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import mongoose from "mongoose";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { env } from "../../src/config/env.js";
import { Order } from "../../src/models/Order.js";
import { Customization } from "../../src/models/Customization.js";
import { EmailNotification } from "../../src/models/EmailNotification.js";
import { ResendEmailProvider, transactionalEmailProvider } from "../../src/services/resend-email-provider.js";
import { retryTransactionalEmail, sendOrderCreatedEmails, sendTransactionalEmail } from "../../src/services/transactional-email.service.js";
import { renderTransactionalOrderEmail } from "../../src/emails/templates/transactionalOrderEmail.js";
import { getEmailLogoUrl } from "../../src/emails/components/orderEmailParts.js";
import { setupTestDB, clearTestDB, teardownTestDB } from "../setup/test-db.js";
import { createAdminAuthHeader } from "../setup/test-auth.js";

const app = createApp();
const productId = new mongoose.Types.ObjectId();
const pickup = { methodId: "pickup-free", type: "PICKUP_FREE", label: "Recogida gratuita", pickupAddress: "Calle Taller 1", instructions: "Llama al llegar", price: 0 };
const local = { methodId: "local-urgent", type: "LOCAL_URGENT", label: "Envío urgente local", price: 5 };
const address = { fullName: "Nombre privado", street: "Calle Sol 1", city: "Madrid", state: "Madrid", postalCode: "28001", country: "España" };

function orderData(overrides = {}) {
  return {
    customer: { fullName: "Ana <script>", email: "ana@test.com", phone: "600123123" },
    guestId: "email-test", guestEmail: "legacy@test.com", createdAt: new Date("2026-10-05T10:00:00Z"),
    items: [{ productId, name: "Taza <b>personalizada</b>", quantity: 2, price: 12.5, customizationId: new mongoose.Types.ObjectId(), selectedSurfaceIds: ["wrap-main"] },
      { productId, name: "Taza personalizada", quantity: 1, price: 12.5, customizationId: new mongoose.Types.ObjectId(), selectedSurfaceIds: ["wrap-main"] }],
    subtotal: 37.5, discountAmount: 2, total: 35.5, shipping: pickup,
    payment: { method: "bizum", status: "pending", instructionsSnapshot: { recipient: "600000000", instructions: "Usa la referencia" } },
    orderPreparation: { preparationRequired: true, minDays: 2, maxDays: 4 },
    ...overrides,
  };
}

before(async () => { await setupTestDB(); env.TRANSACTIONAL_EMAIL.adminEmail = "admin@test.com"; });
beforeEach(async () => { await clearTestDB(); });
after(async () => { await teardownTestDB(); });

test("provider HTTP envía cabeceras y contenido correctos sin SDK ni red real", async () => {
  let captured;
  const provider = new ResendEmailProvider({
    config: { enabled: true, apiKey: "test-key", fromEmail: "ventas@example.test", fromName: "MiTiendaPerso" },
    fetchImpl: async (url, options) => { captured = { url, options }; return { ok: true, json: async () => ({ id: "resend-1" }) }; },
  });
  const result = await provider.send({ to: "ana@test.com", subject: "Pedido", html: "<p>Hola</p>", text: "Hola", replyTo: "ayuda@example.test", idempotencyKey: "order-1" });
  assert.equal(result.id, "resend-1");
  assert.equal(captured.url, "https://api.resend.com/emails");
  assert.equal(captured.options.headers["Idempotency-Key"], "order-1");
  assert.equal(JSON.parse(captured.options.body).to[0], "ana@test.com");
  assert.equal(JSON.parse(captured.options.body).reply_to, "ayuda@example.test");
  assert.equal(captured.options.headers.Authorization, "Bearer test-key");
  const misconfigured = new ResendEmailProvider({ config: { enabled: true, apiKey: "", fromEmail: "" }, fetchImpl: async () => { throw new Error("must not call network"); } });
  await assert.rejects(misconfigured.send({ to: "ana@test.com", subject: "x", html: "x" }), /email_not_configured/);
});

test("el logo de email existe como PNG local", () => {
  const asset = readFileSync(new URL("../../../frontend/public/brand/milugui-logo-email.png", import.meta.url));
  assert.deepEqual(asset.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
});

test("templates usan snapshots, mantienen dos diseños y escapan HTML", () => {
  const order = { _id: "order-1", ...orderData() };
  const received = renderTransactionalOrderEmail(order, "ORDER_RECEIVED");
  assert.match(received.subject, /Pedido recibido/);
  assert.match(received.html, /Ana &lt;script&gt;/);
  assert.doesNotMatch(received.html, /<script>|<b>personalizada/);
  assert.match(received.text, /Diseño 1/);
  assert.match(received.text, /Diseño 2/);
  assert.match(received.text, /Calle Taller 1/);
  assert.doesNotMatch(received.text, /Nombre privado|storageKey|designDocument/);
  assert.match(renderTransactionalOrderEmail(order, "PAYMENT_PENDING").text, /600000000|Usa la referencia/);
  const transfer = renderTransactionalOrderEmail({ ...order, payment: { method: "bank_transfer", instructionsSnapshot: { accountHolder: "MiTienda", iban: "ES123", instructions: "Referencia" } } }, "PAYMENT_PENDING");
  assert.match(transfer.text, /ES123|MiTienda/);
  const localMail = renderTransactionalOrderEmail({ ...order, shipping: local, shippingAddress: address }, "ORDER_SHIPPED");
  assert.match(localMail.text, /Calle Sol 1/);
  assert.doesNotMatch(localMail.text, /distanceKm|ORS|Seguimiento/);
});

test("branding email usa logo público seguro o nombre textual sin URL rota", () => {
  const order = { _id: "order-1", ...orderData() };
  assert.equal(getEmailLogoUrl("https://shop.example.test/catalogo"), "https://shop.example.test/brand/milugui-logo-email.png");
  assert.equal(getEmailLogoUrl("http://shop.example.test"), null);
  const publicEmail = renderTransactionalOrderEmail(order, "ORDER_RECEIVED", { publicStorefrontUrl: "https://shop.example.test/catalogo" });
  assert.match(publicEmail.html, /src="https:\/\/shop\.example\.test\/brand\/milugui-logo-email\.png"/);
  assert.match(publicEmail.html, /alt="MiLuGui"/);
  for (const unsafe of [null, "", "https://localhost:5173", "http://localhost:5173", "file:///C:/brand", "C:\\Users\\Amed", "https://127.0.0.1", "https://192.168.1.10"]) {
    const html = renderTransactionalOrderEmail(order, "ORDER_RECEIVED", { publicStorefrontUrl: unsafe }).html;
    assert.match(html, />MiLuGui<\/strong>/);
    assert.doesNotMatch(html, /<img|file:\/\/|localhost|C:\\Users/);
  }
});

test("enviar con URL HTTPS válida incluye logo sin consultar al frontend", async () => {
  const previousUrl = env.PUBLIC_STOREFRONT_URL;
  env.PUBLIC_STOREFRONT_URL = "https://shop.example.test/catalogo";
  const fetchMock = mock.method(globalThis, "fetch", async () => { throw new Error("No debe consultar el frontend"); });
  let html;
  try {
    const order = await Order.create(orderData());
    const result = await sendTransactionalEmail(order, "ORDER_RECEIVED", {
      provider: { send: async (payload) => { html = payload.html; return { id: "resend-logo-test" }; } },
    });
    assert.equal(result.status, "sent");
    assert.match(html, /src="https:\/\/shop\.example\.test\/brand\/milugui-logo-email\.png"/);
    assert.equal(fetchMock.mock.calls.length, 0);
  } finally {
    fetchMock.mock.restore();
    env.PUBLIC_STOREFRONT_URL = previousUrl;
  }
});

test("segunda pasada: total, Bizum y footer condicional mantienen HTML comercial escapado", () => {
  const order = { _id: "order-1", ...orderData({
    payment: { method: "bizum", status: "pending", instructionsSnapshot: { recipient: "+34 600 000 000", instructions: "Usa <el pedido>" } },
  }) };
  const received = renderTransactionalOrderEmail(order, "ORDER_RECEIVED", { publicStorefrontUrl: null });
  assert.match(received.html, /Resumen<\/h2>/);
  assert.match(received.html, /<strong>Total<\/strong>/);
  assert.match(received.html, /font-size:22px/);
  assert.match(received.html, /Personalización<\/strong>/);
  assert.match(received.html, /Punto de recogida/);
  assert.doesNotMatch(received.html, /Si necesitas ayuda|<img|wrap-main|<script>/);
  const pending = renderTransactionalOrderEmail(order, "PAYMENT_PENDING", { publicStorefrontUrl: null, replyTo: "ayuda@example.test" });
  for (const expected of ["Pago pendiente", "Bizum", "Importe", "35,50 €", "Enviar a", "+34 600 000 000", "Concepto", "PEDIDO-order-1", "Instrucciones", "Usa &lt;el pedido&gt;"]) {
    assert.ok(pending.html.includes(expected), expected);
  }
  assert.ok(pending.html.indexOf("Pago pendiente</h2>") < pending.html.indexOf("Productos</h2>"));
  assert.match(pending.html, /Si necesitas ayuda, responde a este correo/);
  assert.doesNotMatch(pending.html, /<el pedido>|wrap-main/);
});

test("superficies y variantes son comerciales; correos de estado son breves", () => {
  const order = { _id: "order-1", ...orderData({
    items: [{ productId, name: "Camiseta personalizada", quantity: 2, price: 24.9, customizationId: new mongoose.Types.ObjectId(), variant: { size: "M", color: "Blanco" }, selectedSurfaceIds: ["tshirt-front", "tshirt-back"] }],
    subtotal: 49.8, discountAmount: 0, total: 54.8, shipping: local, shippingAddress: address,
  }) };
  const received = renderTransactionalOrderEmail(order, "ORDER_RECEIVED");
  assert.match(received.text, /Talla: M|Color: Blanco|Frontal|Trasera|Cantidad: 2|54,80 €/);
  assert.doesNotMatch(received.html, /tshirt-front|tshirt-back|surfaceId|templateId|sizeId|colorId/);
  for (const event of ["PAYMENT_CONFIRMED", "ORDER_IN_PRODUCTION", "ORDER_SHIPPED"]) {
    const mail = renderTransactionalOrderEmail(order, event);
    assert.match(mail.html, /MiLuGui|Total del pedido/);
    assert.doesNotMatch(mail.html, /<h2[^>]*>Productos<\/h2>/);
  }
  const pickupStatus = renderTransactionalOrderEmail({ ...order, shipping: pickup, shippingAddress: null }, "ORDER_READY_FOR_PICKUP");
  assert.match(pickupStatus.text, /Calle Taller 1|Llama al llegar/);
  const admin = renderTransactionalOrderEmail(order, "NEW_ORDER_ADMIN");
  assert.match(admin.text, /Nuevo pedido|Datos clave|Total: 54,80 €|Camiseta personalizada/);
});

test("registro idempotente, fallo y reintento explícito", async () => {
  const order = await Order.create(orderData());
  const calls = [];
  const provider = { send: async (payload) => { calls.push(payload); if (calls.length === 1) throw new Error("private token in error"); return { id: "resend-2" }; } };
  const failed = await sendTransactionalEmail(order, "ORDER_RECEIVED", { provider });
  assert.equal(failed.status, "failed");
  assert.equal(failed.lastError, "email_provider_error");
  await sendTransactionalEmail(order, "ORDER_RECEIVED", { provider });
  assert.equal(calls.length, 1);
  const sent = await retryTransactionalEmail(order._id, "ORDER_RECEIVED", { provider });
  assert.equal(sent.status, "sent");
  assert.equal(sent.attempts, 2);
  assert.equal(sent.providerMessageId, "resend-2");
  assert.equal(calls[0].idempotencyKey, calls[1].idempotencyKey);
  await sendTransactionalEmail(order, "ORDER_RECEIVED", { provider });
  assert.equal(calls.length, 2);
});

test("dos disparos concurrentes del mismo evento producen un solo envío", async () => {
  const order = await Order.create(orderData());
  let sends = 0;
  const provider = { send: async () => { sends += 1; await new Promise((resolve) => setTimeout(resolve, 15)); return { id: "resend-once" }; } };
  await Promise.all([
    sendTransactionalEmail(order, "ORDER_RECEIVED", { provider }),
    sendTransactionalEmail(order, "ORDER_RECEIVED", { provider }),
  ]);
  assert.equal(sends, 1);
  assert.equal(await EmailNotification.countDocuments({ orderId: order._id, event: "ORDER_RECEIVED" }), 1);
});

test("creación emite cliente, pago pendiente y admin a destinatarios correctos", async () => {
  const order = await Order.create(orderData());
  const calls = [];
  const provider = { send: async (payload) => { calls.push(payload); return { id: `id-${calls.length}` }; } };
  await sendOrderCreatedEmails(order, { provider });
  assert.deepEqual(calls.map((call) => call.to), ["ana@test.com", "ana@test.com", "admin@test.com"]);
  assert.equal(await EmailNotification.countDocuments({ orderId: order._id }), 3);
  await sendOrderCreatedEmails(order, { provider });
  assert.equal(calls.length, 3);
});

test("retry HTTP requiere Admin y solo admite eventos fallidos", async () => {
  const order = await Order.create(orderData());
  const adminAuth = await createAdminAuthHeader();
  const failProvider = { send: async () => { throw new Error("private secret must not leak"); } };
  await sendTransactionalEmail(order, "ORDER_RECEIVED", { provider: failProvider });
  assert.equal((await request(app).post(`/api/orders/${order._id}/emails/ORDER_RECEIVED/retry`)).status, 401);
  const emailMock = mock.method(transactionalEmailProvider, "send", async () => ({ id: "resend-retry" }));
  try {
    const response = await request(app).post(`/api/orders/${order._id}/emails/ORDER_RECEIVED/retry`).set("Authorization", adminAuth);
    assert.equal(response.status, 200);
    assert.equal(response.body.email.status, "sent");
    const again = await request(app).post(`/api/orders/${order._id}/emails/ORDER_RECEIVED/retry`).set("Authorization", adminAuth);
    assert.equal(again.status, 404);
    assert.equal(emailMock.mock.calls.length, 1);
  } finally { emailMock.mock.restore(); }
});

test("admin confirma pago y transición pickup una vez; reintento exige admin", async () => {
  const order = await Order.create(orderData());
  const adminAuth = await createAdminAuthHeader();
  const emailMock = mock.method(transactionalEmailProvider, "send", async () => ({ id: new mongoose.Types.ObjectId().toString() }));
  try {
    const paid = await request(app).post(`/api/orders/${order._id}/mark-paid`).set("Authorization", adminAuth);
    assert.equal(paid.status, 200);
    assert.equal((await EmailNotification.findOne({ orderId: order._id, event: "PAYMENT_CONFIRMED" })).status, "sent");
    const ready = await request(app).patch(`/api/orders/${order._id}/status`).set("Authorization", adminAuth).send({ status: "ready_for_pickup" });
    assert.equal(ready.status, 200);
    const repeat = await request(app).patch(`/api/orders/${order._id}/status`).set("Authorization", adminAuth).send({ status: "ready_for_pickup" });
    assert.equal(repeat.status, 200);
    assert.equal(await EmailNotification.countDocuments({ orderId: order._id, event: "ORDER_READY_FOR_PICKUP" }), 1);
    assert.equal((await request(app).get(`/api/orders/${order._id}/emails`)).status, 401);
    assert.equal((await request(app).get(`/api/orders/${order._id}/emails`).set("Authorization", adminAuth)).body.emails.length, 2);
    assert.equal((await request(app).patch(`/api/orders/${order._id}/status`).set("Authorization", adminAuth).send({ status: "shipped" })).status, 409);
  } finally { emailMock.mock.restore(); }
});

test("estado enviado solo para delivery y producción V2 dispara una vez", async () => {
  const order = await Order.create(orderData({ shipping: local, shippingAddress: address }));
  const customization = await Customization.create({ productId, orderId: order._id, schemaVersion: 2, productionStatus: "ready" });
  const adminAuth = await createAdminAuthHeader();
  const emailMock = mock.method(transactionalEmailProvider, "send", async () => ({ id: new mongoose.Types.ObjectId().toString() }));
  try {
    const production = await request(app).patch(`/api/customizations/${customization._id}/status`).set("Authorization", adminAuth).send({ status: "in_production" });
    assert.equal(production.status, 200);
    assert.equal((await EmailNotification.findOne({ orderId: order._id, event: "ORDER_IN_PRODUCTION" })).status, "sent");
    const shipped = await request(app).patch(`/api/orders/${order._id}/status`).set("Authorization", adminAuth).send({ status: "shipped" });
    assert.equal(shipped.status, 200);
    assert.equal((await EmailNotification.findOne({ orderId: order._id, event: "ORDER_SHIPPED" })).status, "sent");
  } finally { emailMock.mock.restore(); }
});
