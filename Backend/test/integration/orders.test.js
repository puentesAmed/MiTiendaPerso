import test, { before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

import { createApp } from "../../src/app.js";
import { Product } from "../../src/models/Product.js";
import { Order } from "../../src/models/Order.js";
import { setupTestDB, clearTestDB, teardownTestDB } from "../setup/test-db.js";
import { createAdminAuthHeader } from "../setup/test-auth.js";

const app = createApp();

function validOrderPayload(productId) {
  return {
    guestId: "guest-test-1",
    email: "guest@test.com",
    items: [{ productId, quantity: 1, provider: "local", price: 20 }],
    shippingAddress: {
      fullName: "Cliente Test",
      street: "Calle Test 1",
      city: "Madrid",
      state: "Madrid",
      postalCode: "28001",
      country: "España",
    },
    billingAddress: {
      fullName: "Cliente Test",
      street: "Calle Test 1",
      city: "Madrid",
      state: "Madrid",
      postalCode: "28001",
      country: "España",
    },
    shipping: {
      zone: "peninsula",
      price: 5.99,
      isFree: false,
      estimatedDays: { min: 2, max: 3 },
    },
    total: 25.99,
  };
}

before(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret";
  process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@test.com";
  await setupTestDB();
});

beforeEach(async () => {
  await clearTestDB();
});

after(async () => {
  await teardownTestDB();
});

test("crear pedido nuevo inicializa status, payment.status y paymentStatus", async () => {
  const product = await Product.create({
    name: "Producto Test",
    price: 20,
    stock: 10,
    active: true,
  });

  const res = await request(app).post("/api/orders").send(validOrderPayload(product._id.toString()));

  assert.equal(res.status, 201);
  assert.equal(res.body.order.status, "created");
  assert.equal(res.body.order.payment?.status, "pending");
  assert.equal(res.body.order.paymentStatus, "pending");
});

test("mark-paid sin token devuelve 401", async () => {
  const order = await Order.create({
    guestId: "g1",
    guestEmail: "guest@test.com",
    items: [{ productId: productId(), name: "P", quantity: 1, price: 10 }],
    total: 10,
    status: "created",
    shipping: {
      zone: "peninsula",
      price: 0,
      isFree: true,
      estimatedDays: { min: 1, max: 2 },
      estimatedDeliveryDate: new Date(),
      deliveryStatus: "estimated",
    },
    shippingAddress: address(),
    payment: { status: "pending" },
    paymentStatus: "pending",
  });

  const res = await request(app).post(`/api/orders/${order._id}/mark-paid`).send();
  assert.equal(res.status, 401);
});

test("mark-paid con admin en pedido pendiente marca pago y no cambia status operativo", async () => {
  const authHeader = await createAdminAuthHeader();
  const order = await Order.create({
    guestId: "g2",
    guestEmail: "guest@test.com",
    items: [{ productId: productId(), name: "P", quantity: 1, price: 10 }],
    total: 10,
    status: "created",
    shipping: {
      zone: "peninsula",
      price: 0,
      isFree: true,
      estimatedDays: { min: 1, max: 2 },
      estimatedDeliveryDate: new Date(),
      deliveryStatus: "estimated",
    },
    shippingAddress: address(),
    payment: { status: "pending", method: null, provider: null, metadata: {} },
    paymentStatus: "pending",
  });

  const res = await request(app)
    .post(`/api/orders/${order._id}/mark-paid`)
    .set("Authorization", authHeader)
    .send();

  assert.equal(res.status, 200);
  const updated = await Order.findById(order._id).lean();
  assert.equal(updated.payment.status, "paid");
  assert.equal(updated.paymentStatus, "paid");
  assert.equal(updated.status, "created");
});

test("mark-paid en pedido cancelado devuelve 409", async () => {
  const authHeader = await createAdminAuthHeader();
  const order = await Order.create(baseOrder({ status: "cancelled", paymentStatus: "pending" }));

  const res = await request(app)
    .post(`/api/orders/${order._id}/mark-paid`)
    .set("Authorization", authHeader)
    .send();
  assert.equal(res.status, 409);
});

test("mark-paid en pedido ya pagado devuelve 409", async () => {
  const authHeader = await createAdminAuthHeader();
  const order = await Order.create(
    baseOrder({
      status: "created",
      payment: { status: "paid", method: "manual", provider: "manual" },
      paymentStatus: "paid",
    })
  );

  const res = await request(app)
    .post(`/api/orders/${order._id}/mark-paid`)
    .set("Authorization", authHeader)
    .send();
  assert.equal(res.status, 409);
});

function productId() {
  return "507f1f77bcf86cd799439011";
}

function address() {
  return {
    fullName: "Cliente",
    street: "Calle 1",
    city: "Madrid",
    state: "Madrid",
    postalCode: "28001",
    country: "España",
  };
}

function baseOrder(overrides = {}) {
  return {
    guestId: "gbase",
    guestEmail: "guest@test.com",
    items: [{ productId: productId(), name: "P", quantity: 1, price: 10 }],
    total: 10,
    status: "created",
    shipping: {
      zone: "peninsula",
      price: 0,
      isFree: true,
      estimatedDays: { min: 1, max: 2 },
      estimatedDeliveryDate: new Date(),
      deliveryStatus: "estimated",
    },
    shippingAddress: address(),
    payment: { status: "pending", method: null, provider: null, metadata: {} },
    paymentStatus: "pending",
    ...overrides,
  };
}

