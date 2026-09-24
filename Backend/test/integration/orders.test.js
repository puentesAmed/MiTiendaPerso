import test, { before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import path from "node:path";
import request from "supertest";

import { createApp } from "../../src/app.js";
import { Product } from "../../src/models/Product.js";
import { Order } from "../../src/models/Order.js";
import { Customization } from "../../src/models/Customization.js";
import { setupTestDB, clearTestDB, teardownTestDB } from "../setup/test-db.js";
import {
  createAdminAuthHeader,
  createTokenForUser,
  createUser,
} from "../setup/test-auth.js";

const app = createApp();

function validOrderPayload(productId) {
  return {
    guestId: "guest-test-1",
    email: "guest@test.com",
    paymentMethod: "bizum",
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

function validDesignerCustomizationV1() {
  return {
    type: "designer",
    design: {
      side: "front",
      notes: "",
      elementsBySide: {
        front: [
          {
            id: "txt-1",
            type: "text",
            text: "Hola",
            x: 120,
            y: 140,
            fontSize: 24,
            fontFamily: "Arial",
            fill: "#000000",
            rotation: 0,
          },
        ],
        back: [],
      },
    },
    previewsBySide: { front: "data:image/png;base64,AAA", back: null },
    previewImage: "data:image/png;base64,AAA",
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
  });

  // createOrder filtra por { active: true } en producto local.
  // ProductSchema actual no define "active", por eso se fuerza vía colección.
  await Product.collection.updateOne(
    { _id: product._id },
    { $set: { active: true } }
  );

  const res = await request(app).post("/api/orders").send(validOrderPayload(product._id.toString()));

  assert.equal(
    res.status,
    201,
    `Esperado 201, recibido ${res.status}. Body: ${JSON.stringify(res.body)}`
  );
  assert.equal(res.body.order.status, "created");
  assert.equal(res.body.order.payment?.status, "pending");
  assert.equal(res.body.order.paymentStatus, "pending");
});

test("createOrder con customization v1 (designer) sigue creando Customization", async () => {
  const product = await Product.create({
    name: "Producto Custom Test",
    price: 20,
    stock: 10,
    customizable: true,
  });

  await Product.collection.updateOne(
    { _id: product._id },
    { $set: { active: true } }
  );

  const payload = validOrderPayload(product._id.toString());
  payload.items = [
    {
      productId: product._id.toString(),
      quantity: 1,
      provider: "local",
      price: 20,
      customization: validDesignerCustomizationV1(),
    },
  ];

  const res = await request(app).post("/api/orders").send(payload);

  assert.equal(
    res.status,
    201,
    `Esperado 201, recibido ${res.status}. Body: ${JSON.stringify(res.body)}`
  );
  assert.ok(res.body.order?.items?.[0]?.customizationId);

  const customization = await Customization.findById(
    res.body.order.items[0].customizationId
  ).lean();
  assert.ok(customization);
  if (customization.zipUrl) {
    await rm(
      path.resolve(process.cwd(), customization.zipUrl.replace(/^\/+/, "")),
      { force: true }
    );
  }
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
    payment: { status: "pending", method: "bizum", provider: "manual", metadata: {} },
    paymentStatus: "pending",
  });

  const res = await request(app)
    .post(`/api/orders/${order._id}/mark-paid`)
    .set("Authorization", authHeader)
    .send();

  assert.equal(res.status, 200);
  const updated = await Order.findById(order._id).lean();
  assert.equal(updated.payment.status, "paid");
  assert.equal(updated.payment.method, "bizum");
  assert.ok(updated.payment.confirmedAt);
  assert.ok(updated.payment.confirmedBy);
  assert.equal(updated.paymentStatus, "paid");
  assert.ok(updated.paymentConfirmedAt);
  assert.equal(updated.status, "created");
});

test("mark-paid con usuario no administrador devuelve 403", async () => {
  const user = await createUser({
    role: "user",
    email: "regular@test.com",
  });
  const order = await Order.create(baseOrder());

  const res = await request(app)
    .post(`/api/orders/${order._id}/mark-paid`)
    .set("Authorization", `Bearer ${createTokenForUser(user)}`)
    .send();

  assert.equal(res.status, 403);
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
