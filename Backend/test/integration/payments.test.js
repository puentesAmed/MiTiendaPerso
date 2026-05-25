import test, { before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

import { createApp } from "../../src/app.js";
import { Order } from "../../src/models/Order.js";
import { setupTestDB, clearTestDB, teardownTestDB } from "../setup/test-db.js";

const app = createApp();

before(async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret";
  await setupTestDB();
});

beforeEach(async () => {
  await clearTestDB();
});

after(async () => {
  await teardownTestDB();
});

test("createMoneiPayment con orderId inválido devuelve 400", async () => {
  const res = await request(app).post("/api/payments/monei/create").send({ orderId: "abc" });
  assert.equal(res.status, 400);
});

test("createMoneiPayment con pedido pagado devuelve 409", async () => {
  const order = await Order.create(baseOrder({ payment: { status: "paid" }, paymentStatus: "paid" }));
  const res = await request(app).post("/api/payments/monei/create").send({ orderId: order._id.toString() });
  assert.equal(res.status, 409);
});

test("createMoneiPayment con pedido cancelado devuelve 409", async () => {
  const order = await Order.create(baseOrder({ status: "cancelled" }));
  const res = await request(app).post("/api/payments/monei/create").send({ orderId: order._id.toString() });
  assert.equal(res.status, 409);
});

test("createMoneiPayment con pedido delivered devuelve 409", async () => {
  const order = await Order.create(baseOrder({ status: "delivered" }));
  const res = await request(app).post("/api/payments/monei/create").send({ orderId: order._id.toString() });
  assert.equal(res.status, 409);
});

function baseOrder(overrides = {}) {
  return {
    guestId: "gpay",
    guestEmail: "guest@test.com",
    items: [
      {
        productId: "507f1f77bcf86cd799439012",
        name: "Producto",
        quantity: 1,
        price: 10,
      },
    ],
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
    shippingAddress: {
      fullName: "Cliente",
      street: "Calle",
      city: "Madrid",
      state: "Madrid",
      postalCode: "28001",
      country: "España",
    },
    payment: { status: "pending", method: null, provider: null, metadata: {} },
    paymentStatus: "pending",
    ...overrides,
  };
}

