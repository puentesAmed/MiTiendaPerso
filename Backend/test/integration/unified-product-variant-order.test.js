import test, { after, before, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

import { createApp } from "../../src/app.js";
import { Product } from "../../src/models/Product.js";
import { Order } from "../../src/models/Order.js";
import { emailTransporter } from "../../src/services/email.service.js";
import { getOrderItemVariant } from "../../src/utils/orderVariantAdapter.js";
import { clearTestDB, setupTestDB, teardownTestDB } from "../setup/test-db.js";

const app = createApp();
const emailMock = mock.method(emailTransporter, "sendMail", async () => ({ accepted: [] }));

function address() {
  return { fullName: "Cliente Test", street: "Calle 1", city: "Madrid", state: "Madrid", postalCode: "28001", country: "España" };
}

function payload(productId, overrides = {}) {
  return {
    guestId: "guest-spec003",
    email: "guest@test.com",
    customer: { fullName: "Cliente Test", email: "guest@test.com", phone: "+34 600 123 123" },
    termsAccepted: true,
    paymentMethod: "bizum",
    items: [{ productId, quantity: 1 }],
    shippingAddress: address(),
    ...overrides,
  };
}

async function createProduct(overrides = {}) {
  return Product.create({ name: "Producto", price: 20, stock: 10, active: true, ...overrides });
}

before(setupTestDB);
beforeEach(clearTestDB);
after(async () => {
  emailMock.mock.restore();
  await teardownTestDB();
});

test("19 displayPrice manipulado no altera precio ni total", async () => {
  const product = await createProduct({ price: 20 });
  const response = await request(app).post("/api/orders").send(payload(product.id, {
    items: [{ productId: product.id, quantity: 1, presentation: { displayPrice: 1 } }],
  }));
  assert.equal(response.status, 201, JSON.stringify(response.body));
  assert.equal(response.body.order.items[0].price, 20);
  assert.equal(response.body.order.total, 25.99);
});

test("20 pedido nuevo persiste variante canónica y alias transitorio", async () => {
  const product = await createProduct({ variants: { sizes: ["M"], colors: ["Negro"] } });
  const response = await request(app).post("/api/orders").send(payload(product.id, {
    items: [{ productId: product.id, quantity: 1, variant: { size: "M", color: "Negro" } }],
  }));
  assert.equal(response.status, 201, JSON.stringify(response.body));
  assert.deepEqual(response.body.order.items[0].variant, { size: "M", color: "Negro" });
  assert.deepEqual(response.body.order.items[0].selectedVariant, { size: "M", color: "Negro" });
});

test("21 backend rechaza variante requerida ausente o inexistente", async () => {
  const product = await createProduct({ variants: { sizes: ["M"], colors: ["Negro"] } });
  const missing = await request(app).post("/api/orders").send(payload(product.id));
  const unknown = await request(app).post("/api/orders").send(payload(product.id, {
    items: [{ productId: product.id, quantity: 1, variant: { size: "XL", color: "Negro" } }],
  }));
  assert.equal(missing.status, 400);
  assert.equal(unknown.status, 400);
  assert.equal(await Order.countDocuments(), 0);
});

test("22 backend rechaza stock insuficiente agregado", async () => {
  const product = await createProduct({ stock: 1 });
  const response = await request(app).post("/api/orders").send(payload(product.id, {
    items: [{ productId: product.id, quantity: 1 }, { productId: product.id, quantity: 1 }],
  }));
  assert.equal(response.status, 409);
  assert.equal(await Order.countDocuments(), 0);
});

test("23 pricing shipping y pago manual siguen siendo autoritativos", async () => {
  const product = await createProduct({ price: 60 });
  const quote = await request(app).post("/api/shipping/quote").send({ items: [{ productId: product.id, quantity: 1, variant: null }], shippingAddress: address() });
  const order = await request(app).post("/api/orders").send(payload(product.id));
  assert.equal(quote.status, 200, JSON.stringify(quote.body));
  assert.equal(quote.body.quote.price, 0);
  assert.equal(order.status, 201, JSON.stringify(order.body));
  assert.equal(order.body.order.payment.method, "bizum");
  assert.equal(order.body.order.payment.status, "pending");
});

test("24 alias histórico es legible, conflicto se rechaza y proveedor externo sigue dormido", async () => {
  assert.deepEqual(getOrderItemVariant({ selectedVariant: { size: "M", color: null } }), { size: "M", color: null });
  const product = await createProduct({ variants: { sizes: ["M", "L"], colors: [] } });
  const conflict = await request(app).post("/api/orders").send(payload(product.id, {
    items: [{ productId: product.id, quantity: 1, variant: { size: "M", color: null }, selectedVariant: { size: "L", color: null } }],
  }));
  const external = await request(app).post("/api/orders").send(payload(product.id, {
    items: [{ productId: product.id, quantity: 1, provider: "aliexpress" }],
  }));
  assert.equal(conflict.status, 400);
  assert.equal(external.status, 400);
  assert.equal(await Order.countDocuments(), 0);
});
