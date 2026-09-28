import test, { before, beforeEach, after, mock } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import axios from "axios";

import { createApp } from "../../src/app.js";
import { env } from "../../src/config/env.js";
import { setupTestDB, clearTestDB, teardownTestDB } from "../setup/test-db.js";

const app = createApp();

test("shipping-options heredado no se expone con dropshipping apagado", async () => {
  const mockedPost = mock.method(axios, "post", async () => {
    throw new Error("No debe contactar al proveedor");
  });

  const res = await request(app).post("/api/checkout/shipping-options").send({
    seller_id: "seller1",
    product_id: "prod1",
    sku_id: "sku1",
    quantity: 1,
    address: { country: "ES" },
  });

  assert.equal(res.status, 404);
  assert.equal(mockedPost.mock.callCount(), 0);
  mockedPost.mock.restore();
});

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
  const previousDropshippingEnabled = env.DROPSHIPPING_ENABLED;
  env.DROPSHIPPING_ENABLED = true;
  const enabledApp = createApp();
  env.DROPSHIPPING_ENABLED = previousDropshippingEnabled;

  const mockedPost = mock.method(axios, "post", async () => {
    const err = new Error("Provider failure");
    err.response = { data: { secret: "upstream-internal-error" } };
    throw err;
  });

  const res = await request(enabledApp).post("/api/checkout/shipping-options").send({
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

