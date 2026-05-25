import test, { before, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import mongoose from "mongoose";

import { createApp } from "../../src/app.js";
import { Product } from "../../src/models/Product.js";
import { setupTestDB, clearTestDB, teardownTestDB } from "../setup/test-db.js";
import { createAdminAuthHeader } from "../setup/test-auth.js";

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

function localProductFixture(overrides = {}) {
  return {
    provider: "local",
    source: "internal",
    name: "Producto Local Test",
    description: "Descripción test",
    category: "test",
    // Para productos locales, normalizePrice exige number en product.price
    price: 19.99,
    stock: 7,
    image: "https://example.com/producto.jpg",
    published: true,
    active: true,
    ...overrides,
  };
}

test("GET /api/products devuelve listado e incluye producto local activo", async () => {
  const created = await Product.create(localProductFixture());

  const res = await request(app).get("/api/products");

  assert.equal(res.status, 200, `Esperado 200, recibido ${res.status}. Body: ${JSON.stringify(res.body)}`);
  assert.equal(res.body.ok, true);
  assert.ok(Array.isArray(res.body.products));

  const found = res.body.products.find((p) => String(p._id) === String(created._id));
  assert.ok(found, "El producto creado no aparece en el listado");
  assert.equal(found.name, created.name);
  assert.equal(found.provider, "local");
  assert.ok(found.price);
  assert.equal(found.price.final, created.price);
  assert.equal(found.stock, created.stock);
});

test("GET /api/products/:id (local) devuelve estructura mínima esperada", async () => {
  const created = await Product.create(localProductFixture({ name: "Producto detalle" }));

  const res = await request(app).get(`/api/products/${created._id}`);

  assert.equal(res.status, 200, `Esperado 200, recibido ${res.status}. Body: ${JSON.stringify(res.body)}`);
  assert.equal(res.body.ok, true);
  assert.ok(res.body.product);
  assert.equal(String(res.body.product._id), String(created._id));
  assert.ok(res.body.product.name || res.body.product.title);
  assert.ok(res.body.product.price);
  assert.equal(res.body.product.provider, "local");
  assert.ok(Object.hasOwn(res.body.product, "stock"));
});

test("GET /api/products/:id inexistente devuelve 404", async () => {
  const missingId = new mongoose.Types.ObjectId().toString();

  const res = await request(app).get(`/api/products/${missingId}`);

  assert.equal(res.status, 404);
  assert.equal(res.body.ok, false);
});

test("POST /api/products sin token devuelve 401", async () => {
  const res = await request(app)
    .post("/api/products")
    .send(localProductFixture({ name: "Sin token" }));

  assert.equal(res.status, 401);
});

test("POST /api/products con admin crea producto", async () => {
  const authHeader = await createAdminAuthHeader();

  const payload = localProductFixture({ name: "Creado por admin", stock: 3 });

  const res = await request(app)
    .post("/api/products")
    .set("Authorization", authHeader)
    .send(payload);

  assert.equal(res.status, 201);
  assert.equal(res.body.ok, true);
  assert.ok(res.body.product?._id);

  const saved = await Product.findById(res.body.product._id).lean();
  assert.ok(saved);
  assert.equal(saved.name, payload.name);
  assert.equal(saved.stock, payload.stock);
});

test("PUT /api/products/:id con admin actualiza nombre/precio/stock", async () => {
  const authHeader = await createAdminAuthHeader();
  const created = await Product.create(localProductFixture({ name: "Antes", stock: 5 }));

  const updatePayload = {
    name: "Después",
    stock: 11,
    price: 44.5,
  };

  const res = await request(app)
    .put(`/api/products/${created._id}`)
    .set("Authorization", authHeader)
    .send(updatePayload);

  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.product.name, "Después");

  const updated = await Product.findById(created._id).lean();
  assert.equal(updated.name, "Después");
  assert.equal(updated.stock, 11);
  assert.equal(updated.price, 44.5);
});

test("DELETE /api/products/:id con admin elimina físicamente el producto", async () => {
  const authHeader = await createAdminAuthHeader();
  const created = await Product.create(localProductFixture({ name: "Para eliminar" }));

  const res = await request(app)
    .delete(`/api/products/${created._id}`)
    .set("Authorization", authHeader)
    .send();

  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);

  const afterDelete = await Product.findById(created._id).lean();
  assert.equal(afterDelete, null);
});
