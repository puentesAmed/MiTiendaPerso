import test, { after, before, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { env } from "../../src/config/env.js";
import { Order } from "../../src/models/Order.js";
import { Product } from "../../src/models/Product.js";
import { ShippingSettings } from "../../src/models/ShippingSettings.js";
import { emailTransporter } from "../../src/services/email.service.js";
import { planPackaging, calculateParcelWeights } from "../../src/services/packaging-planner.service.js";
import { clearShippingSettingsCache, updateShippingSettings } from "../../src/services/shipping-settings.service.js";
import { calculateSelectedShippingQuote, clearShippingDistanceCache, quoteShippingMethods } from "../../src/services/shipping.service.js";
import { clearTestDB, setupTestDB, teardownTestDB } from "../setup/test-db.js";

const app = createApp();
const emailMock = mock.method(emailTransporter, "sendMail", async () => ({ accepted: [] }));
const address = { fullName: "Cliente", street: "Calle 1", city: "Madrid", state: "Madrid", postalCode: "28001", country: "España" };
const localSettings = {
  key: "default", version: 1,
  localUrgent: { enabled: true, label: "Urgente área local", originAddress: "Origen verificado", maxDistanceKm: 20, postalCodes: ["28001"], provinces: ["Madrid"], municipalities: [], bands: [{ minKm: 0, maxKm: 10, amount: 8.5, estimatedDays: { min: 1, max: 1 } }, { minKm: 10, maxKm: 20, amount: 12, estimatedDays: { min: 1, max: 2 } }], freeFrom: 100 },
  parcelStandard: { enabled: true, configured: false, label: "Paquetería", serviceLevel: "standard" },
};
const boundaryBands = [
  { minKm: 0, maxKm: 10, amount: 5 },
  { minKm: 10, maxKm: 20, amount: 8 },
  { minKm: 20, maxKm: 30, amount: 12 },
  { minKm: 30, maxKm: 40, amount: 18 },
];
const boundarySettings = {
  ...localSettings,
  localUrgent: { ...localSettings.localUrgent, maxDistanceKm: 40, bands: boundaryBands, freeFrom: null },
  parcelStandard: { ...localSettings.parcelStandard, enabled: false },
};

before(setupTestDB);
beforeEach(async () => { await clearTestDB(); clearShippingSettingsCache(); clearShippingDistanceCache(); });
after(async () => { emailMock.mock.restore(); await teardownTestDB(); });

test("LOCAL_URGENT aplica cobertura, bandas, gratis y cache de ruta", async () => {
  let calls = 0;
  const options = { settings: localSettings, distanceProvider: async () => { calls += 1; return 7.25; } };
  const first = await quoteShippingMethods({ authoritativeSubtotal: 50, shippingAddress: address }, options);
  const second = await quoteShippingMethods({ authoritativeSubtotal: 120, shippingAddress: address }, options);
  assert.equal(first.methods[0].quote.amount, 8.5);
  assert.equal(first.methods[0].quote.quoteSource, "routing");
  assert.equal(second.methods[0].quote.amount, 0);
  assert.equal(calls, 1);
  const outside = await quoteShippingMethods({ authoritativeSubtotal: 50, shippingAddress: { ...address, postalCode: "46001", state: "Valencia", city: "Valencia" } }, options);
  assert.equal(outside.methods[0].reason, "outside_coverage");
});

test("métodos deshabilitados se anuncian sin quote seleccionable", async () => {
  const settings = { ...localSettings, localUrgent: { ...localSettings.localUrgent, enabled: false }, parcelStandard: { ...localSettings.parcelStandard, enabled: false } };
  const result = await quoteShippingMethods({ authoritativeSubtotal: 20, shippingAddress: address }, { settings });
  assert.deepEqual(result.methods.map(({ available, reason }) => ({ available, reason })), [
    { available: false, reason: "service_disabled" },
    { available: false, reason: "service_disabled" },
  ]);
});

test("LOCAL_URGENT marca fuera de radio y usa fallback solo con cobertura declarada", async () => {
  const outside = await quoteShippingMethods({ authoritativeSubtotal: 20, shippingAddress: address }, { settings: localSettings, distanceProvider: async () => 25 });
  assert.equal(outside.methods[0].reason, "outside_coverage");
  clearShippingDistanceCache();
  const fallback = await quoteShippingMethods({ authoritativeSubtotal: 20, shippingAddress: address }, { settings: localSettings, distanceProvider: async () => { throw new Error("offline"); } });
  assert.equal(fallback.methods[0].available, true);
  assert.equal(fallback.methods[0].quote.quoteSource, "zone_fallback");
});

test("PARCEL_STANDARD no inventa tarifa y PackagingPlanner exige perfil completo", async () => {
  const incompleteLine = { productId: "p1", quantity: 1, product: { shippingProfile: null } };
  const configured = { ...localSettings, localUrgent: { ...localSettings.localUrgent, enabled: false }, parcelStandard: { ...localSettings.parcelStandard, configured: true } };
  const incomplete = await quoteShippingMethods({ authoritativeSubtotal: 20, shippingAddress: address, lines: [incompleteLine] }, { settings: configured });
  assert.equal(incomplete.methods[1].reason, "incomplete_profile");
  const profile = { weightGrams: 450, package: { lengthCm: 20, widthCm: 15, heightCm: 12 }, fragile: null, stackable: null, shippingClass: "standard" };
  const line = { productId: "p2", quantity: 2, product: { shippingProfile: profile } };
  const plan = planPackaging([line]);
  assert.equal(plan.status, "ready");
  assert.equal(plan.parcels.length, 2);
  assert.equal(calculateParcelWeights(plan.parcels[0], {}).volumetricWeightGrams, null);
  const unavailable = await quoteShippingMethods({ authoritativeSubtotal: 20, shippingAddress: address, lines: [line] }, { settings: configured });
  assert.equal(unavailable.methods[1].reason, "provider_unavailable");
  const failed = await quoteShippingMethods({ authoritativeSubtotal: 20, shippingAddress: address, lines: [line] }, { settings: configured, parcelProvider: { quoteParcel: async () => { throw new Error("offline"); } } });
  assert.equal(failed.methods[1].reason, "provider_unavailable");
  const quoted = await quoteShippingMethods({ authoritativeSubtotal: 20, shippingAddress: address, lines: [line] }, { settings: configured, parcelProvider: { quoteParcel: async () => ({ providerId: "test-provider", serviceId: "standard", amount: 9.75, currency: "EUR", estimatedDays: { min: 2, max: 3 } }) } });
  assert.equal(quoted.methods[1].quote.amount, 9.75);
  assert.equal(quoted.methods[1].quote.parcels.length, 2);
});

test("Admin valida bandas y persiste ShippingSettings independiente", async () => {
  assert.equal((await request(app).get("/api/shipping/admin/settings")).status, 401);
  const token = jwt.sign({ sub: "507f1f77bcf86cd799439011", role: "admin", email: "admin@test.com" }, env.JWT_SECRET);
  const invalid = await request(app).put("/api/shipping/admin/settings").set("Authorization", `Bearer ${token}`).send({ localUrgent: { ...localSettings.localUrgent, bands: [{ minKm: 5, maxKm: 3, amount: 1, estimatedDays: { min: 1, max: 1 } }] } });
  assert.equal(invalid.status, 400);
  const saved = await request(app).put("/api/shipping/admin/settings").set("Authorization", `Bearer ${token}`).send(localSettings);
  assert.equal(saved.status, 200, JSON.stringify(saved.body));
  const read = await request(app).get("/api/shipping/admin/settings").set("Authorization", `Bearer ${token}`);
  assert.equal(read.body.settings.localUrgent.enabled, true);
  assert.equal(read.body.settings.localUrgent.label, "Urgente área local");
  assert.equal(read.body.settings.localUrgent.originAddress, "Origen verificado");
  assert.equal(read.body.settings.localUrgent.maxDistanceKm, 20);
  assert.equal(read.body.settings.localUrgent.bands.length, 2);
  assert.deepEqual(read.body.settings.localUrgent.postalCodes, ["28001"]);
  assert.deepEqual(read.body.settings.localUrgent.provinces, ["Madrid"]);
  assert.deepEqual(read.body.settings.localUrgent.municipalities, []);
  assert.equal(read.body.settings.parcelStandard.configured, false);
});

test("Admin guarda bandas sin estimatedDays y quote respeta fronteras semiabiertas", async () => {
  const token = jwt.sign({ sub: "507f1f77bcf86cd799439011", role: "admin", email: "admin@test.com" }, env.JWT_SECRET);
  const saved = await request(app).put("/api/shipping/admin/settings").set("Authorization", `Bearer ${token}`).send(boundarySettings);
  assert.equal(saved.status, 200, JSON.stringify(saved.body));

  const stored = await ShippingSettings.findOne({ key: "default" }).lean();
  assert.deepEqual(stored.localUrgent.bands.map(({ minKm, maxKm, amount, estimatedDays }) => ({ minKm, maxKm, amount, estimatedDays })),
    boundaryBands.map((band) => ({ ...band, estimatedDays: null })));

  const read = await request(app).get("/api/shipping/admin/settings").set("Authorization", `Bearer ${token}`);
  assert.equal(read.status, 200, JSON.stringify(read.body));
  assert.deepEqual(read.body.settings.localUrgent.bands.map(({ minKm, maxKm, amount, estimatedDays }) => ({ minKm, maxKm, amount, estimatedDays })),
    boundaryBands.map((band) => ({ ...band, estimatedDays: null })));

  const cases = [[9.99, 5], [10, 8], [19.99, 8], [20, 12], [40, 18]];
  for (const [distanceKm, amount] of cases) {
    clearShippingDistanceCache();
    const quoted = await quoteShippingMethods(
      { authoritativeSubtotal: 20, shippingAddress: address },
      { distanceProvider: async () => distanceKm }
    );
    assert.equal(quoted.methods[0].available, true);
    assert.equal(quoted.methods[0].quote.amount, amount);
    assert.equal(quoted.methods[0].quote.estimatedDays, null);
  }

  clearShippingDistanceCache();
  const outside = await quoteShippingMethods(
    { authoritativeSubtotal: 20, shippingAddress: address },
    { distanceProvider: async () => 40.01 }
  );
  assert.equal(outside.methods[0].available, false);
  assert.equal(outside.methods[0].reason, "outside_coverage");
});

test("quote devuelve métodos múltiples y mantiene adapter legacy", async () => {
  await updateShippingSettings(localSettings);
  const product = await Product.create({ name: "Producto", price: 20, stock: 3, active: true });
  const response = await request(app).post("/api/shipping/quote").send({ items: [{ productId: product._id, quantity: 1 }], shippingAddress: address });
  assert.equal(response.status, 200, JSON.stringify(response.body));
  assert.deepEqual(response.body.methods.map((method) => method.methodId), ["local-urgent", "parcel-standard"]);
  assert.equal(response.body.methods[0].quote.quoteSource, "zone_fallback");
  assert.equal(response.body.methods[1].reason, "rates_not_configured");
  assert.equal(response.body.quote.price, 5.99);
});

test("pedido ignora amount cliente, recalcula método y congela snapshot", async () => {
  await updateShippingSettings(localSettings);
  const product = await Product.create({ name: "Producto", price: 20, stock: 3, active: true });
  const response = await request(app).post("/api/orders").send({ guestId: "guest-shipping", email: "shipping@test.com", paymentMethod: "bizum", items: [{ productId: product._id, quantity: 1 }], shippingAddress: address, shippingMethodId: "local-urgent", shipping: { price: 0 } });
  assert.equal(response.status, 201, JSON.stringify(response.body));
  assert.equal(response.body.order.shipping.price, 5.99);
  assert.equal(response.body.order.shipping.methodId, "local-urgent");
  assert.equal(response.body.order.shipping.quoteSource, "zone_fallback");
  await updateShippingSettings({ localUrgent: { enabled: false } });
  const stored = await Order.findById(response.body.order._id).lean();
  assert.equal(stored.shipping.price, 5.99);
  assert.equal(stored.shipping.label, "Urgente área local");
});

test("backend rechaza local fuera de cobertura y parcel no configurado aunque el cliente los fuerce", async () => {
  const outside = await calculateSelectedShippingQuote({ authoritativeSubtotal: 20, shippingAddress: { ...address, postalCode: "46001", state: "Valencia", city: "Valencia" }, lines: [], shippingMethodId: "local-urgent" }, { settings: localSettings, distanceProvider: async () => 5 })
    .then(() => null, (error) => error);
  assert.equal(outside.reason, "outside_coverage");
  const parcel = await calculateSelectedShippingQuote({ authoritativeSubtotal: 20, shippingAddress: address, lines: [], shippingMethodId: "parcel-standard" }, { settings: localSettings }).then(() => null, (error) => error);
  assert.equal(parcel.reason, "rates_not_configured");
});
