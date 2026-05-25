import test, { before, beforeEach, after, mock } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import axios from "axios";

import { createApp } from "../../src/app.js";
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

test("shipping-options ante fallo proveedor devuelve mensaje público seguro sin details", async () => {
  const mockedPost = mock.method(axios, "post", async () => {
    const err = new Error("Provider failure");
    err.response = { data: { secret: "upstream-internal-error" } };
    throw err;
  });

  const res = await request(app).post("/api/checkout/shipping-options").send({
    seller_id: "seller1",
    product_id: "prod1",
    sku_id: "sku1",
    quantity: 1,
    address: { country: "ES" },
  });

  mockedPost.mock.restore();

  assert.equal(res.status, 500);
  assert.equal(res.body.ok, false);
  assert.equal(
    res.body.message,
    "No se pudieron calcular las opciones de envío en este momento."
  );
  assert.equal(Object.hasOwn(res.body, "details"), false);
});

