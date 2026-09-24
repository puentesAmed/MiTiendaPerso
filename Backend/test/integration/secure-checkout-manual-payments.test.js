import test, { after, before, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";

import { createApp } from "../../src/app.js";
import { Product } from "../../src/models/Product.js";
import { Order } from "../../src/models/Order.js";
import { env } from "../../src/config/env.js";
import { emailTransporter } from "../../src/services/email.service.js";
import {
  clearTestDB,
  setupTestDB,
  teardownTestDB,
} from "../setup/test-db.js";

const app = createApp();
const emailMock = mock.method(emailTransporter, "sendMail", async () => ({
  accepted: [],
}));

function address(overrides = {}) {
  return {
    fullName: "Cliente Test",
    street: "Calle Test 1",
    city: "Madrid",
    state: "Madrid",
    postalCode: "28001",
    country: "España",
    ...overrides,
  };
}

function orderPayload(productId, overrides = {}) {
  return {
    guestId: "guest-secure-checkout",
    email: "guest@test.com",
    paymentMethod: "bizum",
    items: [{ productId, quantity: 1 }],
    shippingAddress: address(),
    billingAddress: address(),
    notes: "",
    ...overrides,
  };
}

async function createProduct(overrides = {}) {
  return Product.create({
    name: "Producto autoritativo",
    price: 20,
    stock: 10,
    active: true,
    ...overrides,
  });
}

function storedOrder(overrides = {}) {
  return {
    guestId: "guest-payment-test",
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
    shippingAddress: address(),
    payment: {
      status: "pending",
      method: "bizum",
      provider: "manual",
      metadata: {},
    },
    paymentStatus: "pending",
    ...overrides,
  };
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

test("precio, shipping y total manipulados se ignoran", async () => {
  const product = await createProduct({ price: 20 });
  const payload = orderPayload(product._id.toString(), {
    items: [{ productId: product._id.toString(), quantity: 1, price: 1 }],
    shipping: {
      zone: "peninsula",
      price: 0,
      isFree: true,
      estimatedDays: { min: 99, max: 99 },
    },
    total: 1,
  });

  const response = await request(app).post("/api/orders").send(payload);

  assert.equal(response.status, 201, JSON.stringify(response.body));
  assert.equal(response.body.order.items[0].price, 20);
  assert.equal(response.body.order.shipping.price, 5.99);
  assert.equal(response.body.order.total, 25.99);
});

test("subtotal y total se recalculan para varias líneas", async () => {
  const first = await createProduct({ name: "Primero", price: 20 });
  const second = await createProduct({ name: "Segundo", price: 15 });
  const response = await request(app)
    .post("/api/orders")
    .send(
      orderPayload(first._id.toString(), {
        items: [
          { productId: first._id.toString(), quantity: 2, price: 1 },
          { productId: second._id.toString(), quantity: 1, price: 1 },
        ],
        total: 3,
      })
    );

  assert.equal(response.status, 201, JSON.stringify(response.body));
  assert.equal(response.body.order.shipping.price, 5.99);
  assert.equal(response.body.order.total, 60.99);
});

test("quote y pedido usan el mismo cálculo autoritativo", async () => {
  const product = await createProduct({ price: 30 });
  const items = [
    { productId: product._id.toString(), quantity: 2, price: 1 },
  ];
  const shippingAddress = address();

  const quote = await request(app)
    .post("/api/shipping/quote")
    .send({ items, shippingAddress, shipping: { price: 100 } });
  const order = await request(app)
    .post("/api/orders")
    .send(orderPayload(product._id.toString(), { items, shippingAddress }));

  assert.equal(quote.status, 200, JSON.stringify(quote.body));
  assert.equal(order.status, 201, JSON.stringify(order.body));
  assert.equal(quote.body.quote.subtotal, 60);
  assert.equal(quote.body.quote.price, 0);
  assert.equal(quote.body.quote.total, 60);
  assert.equal(order.body.order.shipping.price, quote.body.quote.price);
  assert.equal(order.body.order.total, quote.body.quote.total);
});

test("shipping de islas se calcula y persiste desde backend", async () => {
  const product = await createProduct();
  const response = await request(app)
    .post("/api/orders")
    .send(
      orderPayload(product._id.toString(), {
        shippingAddress: address({ state: "Canarias" }),
        shipping: { zone: "peninsula", price: 0 },
      })
    );

  assert.equal(response.status, 201, JSON.stringify(response.body));
  assert.equal(response.body.order.shipping.zone, "islands");
  assert.equal(response.body.order.shipping.price, 9.99);
  assert.equal(response.body.order.total, 29.99);
});

test("cantidad inválida se rechaza", async () => {
  const product = await createProduct();
  const response = await request(app)
    .post("/api/orders")
    .send(
      orderPayload(product._id.toString(), {
        items: [{ productId: product._id.toString(), quantity: 1.5 }],
      })
    );

  assert.equal(response.status, 400);
  assert.equal(await Order.countDocuments(), 0);
});

test("producto inactivo se rechaza", async () => {
  const product = await createProduct({ active: false });
  const response = await request(app)
    .post("/api/orders")
    .send(orderPayload(product._id.toString()));

  assert.equal(response.status, 400);
  assert.equal(await Order.countDocuments(), 0);
});

test("stock insuficiente agregado se rechaza", async () => {
  const product = await createProduct({ stock: 1 });
  const response = await request(app)
    .post("/api/orders")
    .send(
      orderPayload(product._id.toString(), {
        items: [
          { productId: product._id.toString(), quantity: 1 },
          { productId: product._id.toString(), quantity: 1 },
        ],
      })
    );

  assert.equal(response.status, 409);
  assert.equal(await Order.countDocuments(), 0);
});

test("variante válida se conserva", async () => {
  const product = await createProduct({
    variants: { sizes: ["M"], colors: ["Negro"] },
  });
  const response = await request(app)
    .post("/api/orders")
    .send(
      orderPayload(product._id.toString(), {
        items: [
          {
            productId: product._id.toString(),
            quantity: 1,
            selectedVariant: { size: "M", color: "Negro" },
          },
        ],
      })
    );

  assert.equal(response.status, 201, JSON.stringify(response.body));
  assert.equal(response.body.order.items[0].selectedVariant.size, "M");
  assert.equal(response.body.order.items[0].selectedVariant.color, "Negro");
});

test("variante requerida ausente o desconocida se rechaza", async () => {
  const product = await createProduct({
    variants: { sizes: ["M"], colors: ["Negro"] },
  });
  const response = await request(app)
    .post("/api/orders")
    .send(
      orderPayload(product._id.toString(), {
        items: [
          {
            productId: product._id.toString(),
            quantity: 1,
            selectedVariant: { size: "XL", color: "Negro" },
          },
        ],
      })
    );

  assert.equal(response.status, 400);
  assert.equal(await Order.countDocuments(), 0);
});

test("Bizum crea pending y devuelve solo instrucciones Bizum", async () => {
  const product = await createProduct();
  const response = await request(app)
    .post("/api/orders")
    .send(orderPayload(product._id.toString(), { paymentMethod: "bizum" }));

  assert.equal(response.status, 201, JSON.stringify(response.body));
  assert.equal(response.body.order.payment.method, "bizum");
  assert.equal(response.body.order.payment.provider, "manual");
  assert.equal(response.body.order.payment.status, "pending");
  assert.equal(response.body.order.paymentStatus, "pending");
  assert.equal(response.body.paymentInstructions.method, "bizum");
  assert.equal(
    response.body.paymentInstructions.recipient,
    "test-bizum-recipient"
  );
  assert.equal(Object.hasOwn(response.body.paymentInstructions, "iban"), false);
});

test("transferencia crea pending y devuelve solo instrucciones bancarias", async () => {
  const product = await createProduct();
  const response = await request(app)
    .post("/api/orders")
    .send(
      orderPayload(product._id.toString(), {
        paymentMethod: "bank_transfer",
      })
    );

  assert.equal(response.status, 201, JSON.stringify(response.body));
  assert.equal(response.body.order.payment.method, "bank_transfer");
  assert.equal(response.body.order.payment.status, "pending");
  assert.equal(response.body.order.paymentStatus, "pending");
  assert.equal(response.body.paymentInstructions.method, "bank_transfer");
  assert.equal(
    response.body.paymentInstructions.accountHolder,
    "Test Account Holder"
  );
  assert.equal(
    response.body.paymentInstructions.iban,
    "ES00TEST0000000000000000"
  );
  assert.equal(
    Object.hasOwn(response.body.paymentInstructions, "recipient"),
    false
  );
});

test("método no soportado se rechaza", async () => {
  const product = await createProduct();
  const response = await request(app)
    .post("/api/orders")
    .send(orderPayload(product._id.toString(), { paymentMethod: "card" }));

  assert.equal(response.status, 400);
  assert.equal(await Order.countDocuments(), 0);
});

test("test no es un método de negocio", async () => {
  const product = await createProduct();
  const response = await request(app)
    .post("/api/orders")
    .send(orderPayload(product._id.toString(), { paymentMethod: "test" }));

  assert.equal(response.status, 400);
  assert.equal(await Order.countDocuments(), 0);
});

test("endpoint de desarrollo usa manual y metadata de simulación", async () => {
  const order = await Order.create(storedOrder());
  const response = await request(app)
    .post(`/api/payments/test/mark-paid/${order._id}`)
    .send();

  assert.equal(response.status, 200, JSON.stringify(response.body));
  const updated = await Order.findById(order._id).lean();
  assert.equal(updated.payment.method, "manual");
  assert.equal(updated.payment.status, "paid");
  assert.equal(updated.paymentStatus, "paid");
  assert.equal(updated.payment.metadata.testSimulation, true);
  assert.ok(updated.paymentConfirmedAt);
});

test("el esquema conserva métodos históricos y acepta bank_transfer", async () => {
  const historical = await Order.create(
    storedOrder({
      payment: {
        status: "paid",
        method: "transfer",
        provider: "manual",
        metadata: {},
      },
      paymentStatus: "paid",
    })
  );
  const current = await Order.create(
    storedOrder({
      guestId: "guest-bank-transfer",
      payment: {
        status: "pending",
        method: "bank_transfer",
        provider: "manual",
        metadata: {},
      },
    })
  );

  assert.equal(historical.payment.method, "transfer");
  assert.equal(current.payment.method, "bank_transfer");
});

test("API ofrece únicamente métodos manuales habilitados", async (t) => {
  const previousBizumEnabled = env.MANUAL_PAYMENTS.bizum.enabled;
  const previousBankEnabled = env.MANUAL_PAYMENTS.bankTransfer.enabled;
  env.MANUAL_PAYMENTS.bizum.enabled = false;
  env.MANUAL_PAYMENTS.bankTransfer.enabled = true;
  t.after(() => {
    env.MANUAL_PAYMENTS.bizum.enabled = previousBizumEnabled;
    env.MANUAL_PAYMENTS.bankTransfer.enabled = previousBankEnabled;
  });

  const response = await request(app).get("/api/payments/manual/methods");

  assert.equal(response.status, 200);
  assert.deepEqual(response.body.methods, [
    { id: "bank_transfer", label: "Transferencia bancaria" },
  ]);
});

test("createOrder rechaza un método manual deshabilitado", async (t) => {
  const previousBizumEnabled = env.MANUAL_PAYMENTS.bizum.enabled;
  env.MANUAL_PAYMENTS.bizum.enabled = false;
  t.after(() => {
    env.MANUAL_PAYMENTS.bizum.enabled = previousBizumEnabled;
  });
  const product = await createProduct();

  const response = await request(app)
    .post("/api/orders")
    .send(orderPayload(product._id.toString(), { paymentMethod: "bizum" }));

  assert.equal(response.status, 400);
  assert.equal(await Order.countDocuments(), 0);
});
