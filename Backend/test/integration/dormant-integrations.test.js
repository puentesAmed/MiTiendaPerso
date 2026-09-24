import test, { after, before, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import path from "node:path";
import axios from "axios";
import mongoose from "mongoose";
import request from "supertest";

import { setupTestDB, clearTestDB, teardownTestDB } from "../setup/test-db.js";

process.env.DOTENV_CONFIG_PATH = path.join(
  process.cwd(),
  "test",
  "fixtures",
  "missing.env"
);
process.env.MONGO_URI = "mongodb://127.0.0.1/mitiendaperso-config-only";
process.env.JWT_SECRET = "test-jwt-secret";
process.env.NODE_ENV = "test";
process.env.ALIEXPRESS_CATALOG_ENABLED = "false";
process.env.DROPSHIPPING_ENABLED = "false";
process.env.MONEI_ENABLED = "false";
delete process.env.MONGO_URI_ALIEXPRESS;
delete process.env.DROPSHIPPING_API_URL;
delete process.env.MONEI_API_KEY;
delete process.env.MONEI_WEBHOOK_SECRET;

const affiliateConnectionMock = mock.method(
  mongoose,
  "createConnection",
  () => {
    throw new Error("No debe abrirse la conexión afiliada");
  }
);

const [
  { createApp },
  { Product },
  { Order },
  { emailTransporter },
  { env },
] = await Promise.all([
  import("../../src/app.js"),
  import("../../src/models/Product.js"),
  import("../../src/models/Order.js"),
  import("../../src/services/email.service.js"),
  import("../../src/config/env.js"),
]);

const affiliateConnectionCalls = affiliateConnectionMock.mock.callCount();
affiliateConnectionMock.mock.restore();
const emailMock = mock.method(emailTransporter, "sendMail", async () => ({
  accepted: [],
}));

const app = createApp();

function localProductFixture() {
  return {
    name: "Producto local aislado",
    description: "Producto de prueba",
    price: 20,
    stock: 10,
    active: true,
  };
}

function validOrderPayload(productId, provider = "local") {
  return {
    guestId: "guest-dormant-integrations",
    email: "guest@test.com",
    paymentMethod: "bizum",
    items: [{ productId, quantity: 1, provider, price: 20 }],
    shippingAddress: {
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

function orderFixture(overrides = {}) {
  return {
    guestId: "guest-dormant-integrations",
    guestEmail: "guest@test.com",
    items: [
      {
        productId: new mongoose.Types.ObjectId(),
        name: "Producto histórico",
        quantity: 1,
        price: 20,
        provider: "local",
      },
    ],
    total: 20,
    status: "created",
    payment: { status: "pending", method: null, provider: null, metadata: {} },
    paymentStatus: "pending",
    shipping: {
      zone: "peninsula",
      price: 0,
      isFree: true,
      estimatedDays: { min: 1, max: 2 },
      estimatedDeliveryDate: new Date(),
      deliveryStatus: "estimated",
    },
    shippingAddress: {
      fullName: "Cliente Test",
      street: "Calle Test 1",
      city: "Madrid",
      state: "Madrid",
      postalCode: "28001",
      country: "España",
    },
    ...overrides,
  };
}

function isolatedConfigEnv(overrides = {}) {
  const childEnv = {
    ...process.env,
    DOTENV_CONFIG_PATH: path.join(
      process.cwd(),
      "test",
      "fixtures",
      "missing-child.env"
    ),
    MONGO_URI: "mongodb://127.0.0.1/mitiendaperso-config-only",
    JWT_SECRET: "test-jwt-secret",
    NODE_ENV: "test",
  };

  for (const key of [
    "ALIEXPRESS_CATALOG_ENABLED",
    "DROPSHIPPING_ENABLED",
    "MONEI_ENABLED",
    "MONGO_URI_ALIEXPRESS",
    "DROPSHIPPING_API_URL",
    "MONEI_API_KEY",
    "MONEI_WEBHOOK_SECRET",
  ]) {
    delete childEnv[key];
  }

  return { ...childEnv, ...overrides };
}

function importEnvInChild(overrides = {}) {
  const childEnv = isolatedConfigEnv(overrides);
  for (const [key, value] of Object.entries(overrides)) {
    if (value === null) delete childEnv[key];
  }

  return spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "--eval",
      "import('./src/config/env.js').then(({ env }) => console.log(JSON.stringify(env)))",
    ],
    {
      cwd: process.cwd(),
      env: childEnv,
      encoding: "utf8",
    }
  );
}

before(async () => {
  await setupTestDB();
});

beforeEach(async () => {
  await clearTestDB();
});

after(async () => {
  emailMock.mock.restore();
  await teardownTestDB();
});

test("los tres flags ausentes usan false sin requerir variables externas", () => {
  const result = importEnvInChild();

  assert.equal(result.status, 0, result.stderr);
  const parsed = JSON.parse(result.stdout.trim());
  assert.equal(parsed.ALIEXPRESS_CATALOG_ENABLED, false);
  assert.equal(parsed.DROPSHIPPING_ENABLED, false);
  assert.equal(parsed.MONEI_ENABLED, false);
});

test("una integración habilitada sin configuración falla explícitamente", () => {
  const cases = [
    ["ALIEXPRESS_CATALOG_ENABLED", "MONGO_URI_ALIEXPRESS"],
    ["DROPSHIPPING_ENABLED", "DROPSHIPPING_API_URL"],
    ["MONEI_ENABLED", "MONEI_API_KEY"],
  ];

  for (const [flag, missingVariable] of cases) {
    const result = importEnvInChild({ [flag]: "true" });
    assert.notEqual(result.status, 0, `${flag} debía fallar sin configuración`);
    assert.match(
      `${result.stdout}\n${result.stderr}`,
      new RegExp(missingVariable),
      `El error de ${flag} debe identificar ${missingVariable}`
    );
  }
});

test("la configuración manual incompleta falla explícitamente", () => {
  const result = importEnvInChild({
    MANUAL_PAYMENT_BANK_IBAN: null,
  });

  assert.notEqual(result.status, 0);
  assert.match(
    `${result.stdout}\n${result.stderr}`,
    /MANUAL_PAYMENT_BANK_IBAN/
  );
});

test("el arranque con AliExpress apagado no abre la conexión afiliada", () => {
  assert.equal(affiliateConnectionCalls, 0);
});

test("catálogo y detalle locales funcionan sin infraestructura afiliada", async () => {
  const product = await Product.create(localProductFixture());

  const catalog = await request(app).get("/api/products");
  assert.equal(catalog.status, 200);
  assert.equal(catalog.body.products.length, 1);
  assert.equal(catalog.body.products[0].provider, "local");

  const detail = await request(app).get(`/api/products/${product._id}`);
  assert.equal(detail.status, 200);
  assert.equal(String(detail.body.product._id), String(product._id));

  const missing = await request(app).get(
    `/api/products/${new mongoose.Types.ObjectId()}`
  );
  assert.equal(missing.status, 404);
  assert.equal(affiliateConnectionCalls, 0);
});

test("un pedido local se crea con las tres integraciones apagadas", async () => {
  const product = await Product.create(localProductFixture());

  const response = await request(app)
    .post("/api/orders")
    .send(validOrderPayload(product._id.toString()));

  assert.equal(response.status, 201, JSON.stringify(response.body));
  assert.equal(response.body.order.payment.status, "pending");
  assert.equal(response.body.order.paymentStatus, "pending");
  assert.equal(affiliateConnectionCalls, 0);
});

test("un item AliExpress se rechaza sin cargar la integración", async () => {
  const response = await request(app)
    .post("/api/orders")
    .send(
      validOrderPayload(
        new mongoose.Types.ObjectId().toString(),
        "aliexpress"
      )
    );

  assert.equal(response.status, 400);
  assert.match(response.body.message, /aliexpress/i);
  assert.equal(affiliateConnectionCalls, 0);
});

test("un pedido histórico AliExpress sigue siendo legible", async () => {
  const order = await Order.create(
    orderFixture({
      items: [
        {
          productId: new mongoose.Types.ObjectId(),
          name: "Producto AliExpress histórico",
          quantity: 1,
          price: 20,
          provider: "aliexpress",
          externalId: "legacy-external-id",
          providerSku: "legacy-sku",
        },
      ],
      dropshipping: { sent: true, sentAt: new Date() },
    })
  );

  const response = await request(app).get("/api/orders/track").query({
    orderId: order._id.toString(),
    email: order.guestEmail,
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.order.items[0].name, "Producto AliExpress histórico");
  assert.equal(affiliateConnectionCalls, 0);
});

test("dropshipping apagado no ejecuta fulfillment tras un pago MONEI", async (t) => {
  const externalPost = t.mock.method(axios, "post", async () => {
    throw new Error("No debe realizarse una llamada externa");
  });
  const order = await Order.create(orderFixture());
  const previousMoneiEnabled = env.MONEI_ENABLED;
  const previousWebhookSecret = env.MONEI_WEBHOOK_SECRET;
  env.MONEI_ENABLED = true;
  env.MONEI_WEBHOOK_SECRET = "test-webhook-secret";
  t.after(() => {
    env.MONEI_ENABLED = previousMoneiEnabled;
    env.MONEI_WEBHOOK_SECRET = previousWebhookSecret;
  });

  const event = {
    type: "payment.succeeded",
    data: { orderId: order._id.toString(), id: "payment-test-1" },
  };
  const signature = crypto
    .createHmac("sha256", env.MONEI_WEBHOOK_SECRET)
    .update(JSON.stringify(event))
    .digest("hex");

  const response = await request(app)
    .post("/api/payments/webhooks/monei")
    .set("monei-signature", signature)
    .send(event);

  assert.equal(response.status, 200, JSON.stringify(response.body));
  assert.equal(externalPost.mock.callCount(), 0);

  const updated = await Order.findById(order._id).lean();
  assert.equal(updated.payment.status, "paid");
  assert.equal(updated.status, "processing");
});

test("MONEI apagado no inicia pagos ni procesa webhooks", async (t) => {
  const externalPost = t.mock.method(axios, "post", async () => {
    throw new Error("No debe realizarse una llamada a MONEI");
  });
  const order = await Order.create(orderFixture());

  const payment = await request(app)
    .post("/api/payments/monei/create")
    .send({ orderId: order._id.toString() });
  const webhook = await request(app)
    .post("/api/payments/webhooks/monei")
    .send({ type: "payment.succeeded" });

  assert.equal(payment.status, 503);
  assert.equal(webhook.status, 503);
  assert.equal(externalPost.mock.callCount(), 0);

  const unchanged = await Order.findById(order._id).lean();
  assert.equal(unchanged.payment.status, "pending");
  assert.equal(unchanged.status, "created");
});
