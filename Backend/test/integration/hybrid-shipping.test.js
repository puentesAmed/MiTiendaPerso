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
import { calculateSelectedShippingQuote, clearShippingDistanceCache, quoteShippingMethods, resolveOrsEndpoints } from "../../src/services/shipping.service.js";
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
const pickupSettings = {
  ...localSettings,
  pickupFree: { enabled: true, label: "Recogida gratuita", pickupAddress: "Calle Taller 1", instructions: "Llama al llegar", availabilityText: "Te avisaremos cuando esté listo" },
};
const shippingMethod = (result, methodId) => result.methods.find((method) => method.methodId === methodId);

before(setupTestDB);
beforeEach(async () => { await clearTestDB(); clearShippingSettingsCache(); clearShippingDistanceCache(); });
after(async () => { emailMock.mock.restore(); await teardownTestDB(); });

test("LOCAL_URGENT aplica cobertura, bandas, gratis y cache de ruta", async () => {
  let calls = 0;
  const options = { settings: localSettings, distanceProvider: async () => { calls += 1; return 7.25; } };
  const first = await quoteShippingMethods({ authoritativeSubtotal: 50, shippingAddress: address }, options);
  const second = await quoteShippingMethods({ authoritativeSubtotal: 120, shippingAddress: address }, options);
  assert.equal(shippingMethod(first, "local-urgent").quote.amount, 8.5);
  assert.equal(shippingMethod(first, "local-urgent").quote.quoteSource, "routing");
  assert.equal(shippingMethod(second, "local-urgent").quote.amount, 0);
  assert.equal(calls, 1);
  const outside = await quoteShippingMethods({ authoritativeSubtotal: 50, shippingAddress: { ...address, postalCode: "46001", state: "Valencia", city: "Valencia" } }, options);
  assert.equal(shippingMethod(outside, "local-urgent").reason, "outside_coverage");
});

test("métodos deshabilitados se anuncian sin quote seleccionable", async () => {
  const settings = { ...localSettings, localUrgent: { ...localSettings.localUrgent, enabled: false }, parcelStandard: { ...localSettings.parcelStandard, enabled: false } };
  const result = await quoteShippingMethods({ authoritativeSubtotal: 20, shippingAddress: address }, { settings });
  assert.deepEqual(result.methods.map(({ available, reason }) => ({ available, reason })), [
    { available: false, reason: "service_disabled" },
    { available: false, reason: "service_disabled" },
    { available: false, reason: "service_disabled" },
  ]);
});

test("LOCAL_URGENT marca fuera de radio y usa fallback solo con cobertura declarada", async () => {
  const outside = await quoteShippingMethods({ authoritativeSubtotal: 20, shippingAddress: address }, { settings: localSettings, distanceProvider: async () => 25 });
  assert.equal(shippingMethod(outside, "local-urgent").reason, "outside_coverage");
  clearShippingDistanceCache();
  const fallback = await quoteShippingMethods({ authoritativeSubtotal: 20, shippingAddress: address }, { settings: localSettings, distanceProvider: async () => { throw new Error("offline"); } });
  assert.equal(shippingMethod(fallback, "local-urgent").available, true);
  assert.equal(shippingMethod(fallback, "local-urgent").quote.quoteSource, "zone_fallback");
  assert.equal(shippingMethod(fallback, "local-urgent").quote.amount, 5.99);
  assert.equal(shippingMethod(fallback, "local-urgent").quote.distanceKm, null);
  assert.equal(shippingMethod(fallback, "local-urgent").quote.band, undefined);
});

test("ORS usa distancia por carretera y aplica exclusivamente la banda correspondiente", async () => {
  let routeKm = 7;
  const calls = [];
  const fetchMock = mock.method(globalThis, "fetch", async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).includes("/geocode/search")) {
      const isOrigin = String(url).includes("Origen%20verificado");
      return { ok: true, json: async () => ({ features: [{ geometry: { coordinates: isOrigin ? [-3.8, 40.3] : [-3.7, 40.4] } }] }) };
    }
    return { ok: true, json: async () => ({ features: [{ properties: { summary: { distance: routeKm * 1000 } } }] }) };
  });
  try {
    const distanceConfig = { orsApiKey: "test-key", orsBaseUrl: "https://ors.test/v2", cacheTtlMs: 60_000 };
    for (const [distanceKm, amount, minKm, maxKm] of [[7, 5, 0, 10], [15, 8, 10, 20], [25, 12, 20, 30], [35, 18, 30, 40]]) {
      routeKm = distanceKm;
      clearShippingDistanceCache();
      const result = await quoteShippingMethods({ authoritativeSubtotal: 20, shippingAddress: address }, { settings: boundarySettings, distanceConfig, requestedMethodId: "local-urgent" });
      const local = shippingMethod(result, "local-urgent");
      assert.equal(local.quote.quoteSource, "routing");
      assert.equal(local.quote.distanceKm, distanceKm);
      assert.equal(local.quote.amount, amount);
      assert.deepEqual(local.quote.band, { minKm, maxKm });
      assert.notEqual(local.quote.amount, 5.99);
    }
    routeKm = 40.01;
    clearShippingDistanceCache();
    const outside = await quoteShippingMethods({ authoritativeSubtotal: 20, shippingAddress: address }, { settings: boundarySettings, distanceConfig, requestedMethodId: "local-urgent" });
    assert.equal(shippingMethod(outside, "local-urgent").reason, "outside_coverage");
    routeKm = 7;
    clearShippingDistanceCache();
    const selected = await calculateSelectedShippingQuote({ authoritativeSubtotal: 20, shippingAddress: address, lines: [], shippingMethodId: "local-urgent" }, { settings: boundarySettings, distanceConfig });
    assert.deepEqual(selected.band, { minKm: 0, maxKm: 10 });
    assert.equal(selected.normalizedDestination.postalCode, "28001");
    assert.ok(calls.every(({ url }) => url.startsWith("https://ors.test/")));
    assert.ok(calls.some(({ url }) => url.startsWith("https://ors.test/geocode/search?")));
    assert.ok(calls.some(({ url }) => url === "https://ors.test/v2/directions/driving-car/geojson"));
    assert.ok(calls.every(({ url }) => !url.includes("/v2/v2/")));
  } finally {
    fetchMock.mock.restore();
  }
});

test("ORS normaliza base legacy y expone diagnóstico de fallback sin secretos", async () => {
  assert.deepEqual(resolveOrsEndpoints({ orsBaseUrl: "https://api.heigit.org/openrouteservice/v2" }), {
    geocoding: "https://api.openrouteservice.org/geocode/search",
    routing: "https://api.openrouteservice.org/v2/directions/driving-car/geojson",
  });
  const notConfigured = await quoteShippingMethods(
    { authoritativeSubtotal: 20, shippingAddress: address },
    { settings: localSettings, distanceConfig: { orsApiKey: "", orsBaseUrl: "https://api.openrouteservice.org", cacheTtlMs: 60_000 }, requestedMethodId: "local-urgent" },
  );
  const local = shippingMethod(notConfigured, "local-urgent");
  assert.equal(local.quote.quoteSource, "zone_fallback");
  assert.equal(local.quote.distanceKm, null);
  assert.equal(local.quote.fallbackReason, "ors_not_configured");
  assert.equal(JSON.stringify(local).includes("test-key"), false);
});

test("ORS distingue fallo de geocoding, routing y respuesta inválida", async () => {
  const distanceConfig = { orsApiKey: "test-key", orsBaseUrl: "https://ors.test", cacheTtlMs: 60_000 };
  let mode = "origin";
  let geocodingCalls = 0;
  const fetchMock = mock.method(globalThis, "fetch", async (url) => {
    if (String(url).includes("nominatim")) return { ok: false, status: 503 };
    if (String(url).includes("/geocode/search")) {
      geocodingCalls += 1;
      if (mode === "origin" || (mode === "destination" && geocodingCalls === 2)) return { ok: false, status: 502 };
      return { ok: true, status: 200, json: async () => ({ features: [{ geometry: { coordinates: [-3.8, 40.3] } }] }) };
    }
    if (mode === "routing") return { ok: false, status: 503 };
    return { ok: true, status: 200, json: async () => ({ features: [{}] }) };
  });
  try {
    for (const [currentMode, expectedReason] of [
      ["origin", "origin_geocoding_failed"],
      ["destination", "destination_geocoding_failed"],
      ["routing", "routing_failed"],
      ["invalid", "routing_invalid_response"],
    ]) {
      mode = currentMode;
      geocodingCalls = 0;
      clearShippingDistanceCache();
      const result = await quoteShippingMethods(
        { authoritativeSubtotal: 20, shippingAddress: address },
        { settings: localSettings, distanceConfig, requestedMethodId: "local-urgent" },
      );
      assert.equal(shippingMethod(result, "local-urgent").quote.fallbackReason, expectedReason);
    }
  } finally {
    fetchMock.mock.restore();
  }
});

test("ORS no cachea fallback por fallo transitorio", async () => {
  let routingCalls = 0;
  const fetchMock = mock.method(globalThis, "fetch", async (url) => {
    if (String(url).includes("/geocode/search")) {
      return { ok: true, status: 200, json: async () => ({ features: [{ geometry: { coordinates: [-3.8, 40.3] } }] }) };
    }
    routingCalls += 1;
    if (routingCalls === 1) return { ok: false, status: 503 };
    return { ok: true, status: 200, json: async () => ({ features: [{ properties: { summary: { distance: 7000 } } }] }) };
  });
  try {
    const options = {
      settings: boundarySettings,
      distanceConfig: { orsApiKey: "test-key", orsBaseUrl: "https://ors.test", cacheTtlMs: 60_000 },
      requestedMethodId: "local-urgent",
    };
    const fallback = await quoteShippingMethods({ authoritativeSubtotal: 20, shippingAddress: address }, options);
    const recovered = await quoteShippingMethods({ authoritativeSubtotal: 20, shippingAddress: address }, options);
    assert.equal(shippingMethod(fallback, "local-urgent").quote.quoteSource, "zone_fallback");
    assert.equal(shippingMethod(fallback, "local-urgent").quote.fallbackReason, "routing_failed");
    assert.equal(shippingMethod(recovered, "local-urgent").quote.quoteSource, "routing");
    assert.equal(shippingMethod(recovered, "local-urgent").quote.amount, 5);
    assert.equal(routingCalls, 2);
  } finally {
    fetchMock.mock.restore();
  }
});

test("cambiar destination invalida cache y actualiza distancia y tarifa", async () => {
  let calls = 0;
  const distanceProvider = async ({ destination }) => { calls += 1; return destination.locality === "Madrid" ? 7 : 15; };
  const madrid = await quoteShippingMethods({ authoritativeSubtotal: 20, shippingAddress: address }, { settings: boundarySettings, distanceProvider, requestedMethodId: "local-urgent" });
  const mostoles = await quoteShippingMethods({ authoritativeSubtotal: 20, shippingAddress: { ...address, city: "Móstoles", postalCode: "28931" } }, { settings: boundarySettings, distanceProvider, requestedMethodId: "local-urgent" });
  assert.equal(shippingMethod(madrid, "local-urgent").quote.amount, 5);
  assert.equal(shippingMethod(mostoles, "local-urgent").quote.amount, 8);
  assert.equal(calls, 2);
});

test("PARCEL_STANDARD no inventa tarifa y PackagingPlanner exige perfil completo", async () => {
  const incompleteLine = { productId: "p1", quantity: 1, product: { shippingProfile: null } };
  const configured = { ...localSettings, localUrgent: { ...localSettings.localUrgent, enabled: false }, parcelStandard: { ...localSettings.parcelStandard, configured: true } };
  const incomplete = await quoteShippingMethods({ authoritativeSubtotal: 20, shippingAddress: address, lines: [incompleteLine] }, { settings: configured });
  assert.equal(shippingMethod(incomplete, "parcel-standard").reason, "incomplete_profile");
  const profile = { weightGrams: 450, package: { lengthCm: 20, widthCm: 15, heightCm: 12 }, fragile: null, stackable: null, shippingClass: "standard" };
  const line = { productId: "p2", quantity: 2, product: { shippingProfile: profile } };
  const plan = planPackaging([line]);
  assert.equal(plan.status, "ready");
  assert.equal(plan.parcels.length, 2);
  assert.equal(calculateParcelWeights(plan.parcels[0], {}).volumetricWeightGrams, null);
  const unavailable = await quoteShippingMethods({ authoritativeSubtotal: 20, shippingAddress: address, lines: [line] }, { settings: configured });
  assert.equal(shippingMethod(unavailable, "parcel-standard").reason, "provider_unavailable");
  const failed = await quoteShippingMethods({ authoritativeSubtotal: 20, shippingAddress: address, lines: [line] }, { settings: configured, parcelProvider: { quoteParcel: async () => { throw new Error("offline"); } } });
  assert.equal(shippingMethod(failed, "parcel-standard").reason, "provider_unavailable");
  const quoted = await quoteShippingMethods({ authoritativeSubtotal: 20, shippingAddress: address, lines: [line] }, { settings: configured, parcelProvider: { quoteParcel: async () => ({ providerId: "test-provider", serviceId: "standard", amount: 9.75, currency: "EUR", estimatedDays: { min: 2, max: 3 } }) } });
  assert.equal(shippingMethod(quoted, "parcel-standard").quote.amount, 9.75);
  assert.equal(shippingMethod(quoted, "parcel-standard").quote.parcels.length, 2);
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
  const invalidPickup = await request(app).put("/api/shipping/admin/settings").set("Authorization", `Bearer ${token}`).send({ pickupFree: { enabled: true, label: "Recogida", pickupAddress: "" } });
  assert.equal(invalidPickup.status, 400);
});

test("PICKUP_FREE cotiza sin dirección ni routing y respeta enabled", async () => {
  let routingCalls = 0;
  const enabled = await quoteShippingMethods(
    { authoritativeSubtotal: 20, shippingAddress: address, lines: [] },
    { settings: pickupSettings, requestedMethodId: "pickup-free", distanceProvider: async () => { routingCalls += 1; return 5; } }
  );
  const pickup = shippingMethod(enabled, "pickup-free");
  assert.equal(pickup.available, true);
  assert.equal(pickup.quote.amount, 0);
  assert.equal(pickup.quote.currency, "EUR");
  assert.equal(pickup.quote.quoteSource, "pickup");
  assert.equal(shippingMethod(enabled, "local-urgent").reason, "quote_required");
  assert.equal(routingCalls, 0);

  const disabled = await quoteShippingMethods(
    { authoritativeSubtotal: 20, shippingAddress: null, lines: [] },
    { settings: { ...pickupSettings, pickupFree: { ...pickupSettings.pickupFree, enabled: false } } }
  );
  assert.equal(shippingMethod(disabled, "pickup-free").reason, "service_disabled");
});

test("quote API devuelve pickup sin dirección y rechaza métodos manipulados", async () => {
  await updateShippingSettings(pickupSettings);
  const product = await Product.create({ name: "Producto pickup", price: 20, stock: 3, active: true });
  const response = await request(app).post("/api/shipping/quote").send({ items: [{ productId: product._id, quantity: 1 }] });
  assert.equal(response.status, 200, JSON.stringify(response.body));
  assert.equal(shippingMethod(response.body, "pickup-free").available, true);
  assert.equal(shippingMethod(response.body, "pickup-free").quote.total, 20);
  assert.equal(response.body.quote, null);

  const manipulated = await calculateSelectedShippingQuote({ authoritativeSubtotal: 20, shippingAddress: null, lines: [], shippingMethodId: "free-hack" }, { settings: pickupSettings })
    .then(() => null, (error) => error);
  assert.equal(manipulated.reason, "invalid_method");
});

test("pedido pickup congela configuración y máximo de preparación", async () => {
  await updateShippingSettings(pickupSettings);
  const first = await Product.create({ name: "Preparación corta", price: 10, stock: 3, active: true, fulfillmentProfile: { preparationRequired: true, preparationMinDays: 1, preparationMaxDays: 2 } });
  const second = await Product.create({ name: "Preparación larga", price: 15, stock: 3, active: true, fulfillmentProfile: { preparationRequired: true, preparationMinDays: 3, preparationMaxDays: 5 } });
  const response = await request(app).post("/api/orders").send({ guestId: "guest-pickup", email: "pickup@test.com", paymentMethod: "bizum", items: [{ productId: first._id, quantity: 1 }, { productId: second._id, quantity: 1 }], shippingMethodId: "pickup-free" });
  assert.equal(response.status, 201, JSON.stringify(response.body));
  assert.equal(response.body.order.shipping.price, 0);
  assert.equal(response.body.order.shipping.amount, 0);
  assert.equal(response.body.order.shipping.quoteSource, "pickup");
  assert.equal(response.body.order.shipping.pickupAddress, "Calle Taller 1");
  assert.equal(response.body.order.shippingAddress, null);
  assert.equal(response.body.order.orderPreparation.status, "configured");
  assert.equal(response.body.order.orderPreparation.minDays, 3);
  assert.equal(response.body.order.orderPreparation.maxDays, 5);

  await updateShippingSettings({ pickupFree: { pickupAddress: "Otra dirección", instructions: "Nuevas instrucciones" } });
  await Product.findByIdAndUpdate(second._id, { $set: { "fulfillmentProfile.preparationMinDays": 7, "fulfillmentProfile.preparationMaxDays": 9 } });
  const stored = await Order.findById(response.body.order._id).lean();
  assert.equal(stored.shipping.pickupAddress, "Calle Taller 1");
  assert.equal(stored.shipping.instructions, "Llama al llegar");
  assert.equal(stored.orderPreparation.minDays, 3);
  assert.equal(stored.orderPreparation.maxDays, 5);
});

test("preparación requerida sin plazo queda pendiente sin inventar días", async () => {
  await updateShippingSettings(pickupSettings);
  const product = await Product.create({ name: "Preparación pendiente", price: 12, stock: 2, active: true, fulfillmentProfile: { preparationRequired: true, preparationMinDays: null, preparationMaxDays: null } });
  const response = await request(app).post("/api/orders").send({ guestId: "guest-pending", email: "pending@test.com", paymentMethod: "bizum", items: [{ productId: product._id, quantity: 1 }], shippingMethodId: "pickup-free" });
  assert.equal(response.status, 201, JSON.stringify(response.body));
  assert.equal(response.body.order.orderPreparation.status, "pending_confirmation");
  assert.equal(response.body.order.orderPreparation.minDays, null);
  assert.equal(response.body.order.orderPreparation.maxDays, null);
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
    assert.equal(shippingMethod(quoted, "local-urgent").available, true);
    assert.equal(shippingMethod(quoted, "local-urgent").quote.amount, amount);
    assert.equal(shippingMethod(quoted, "local-urgent").quote.estimatedDays, null);
  }

  clearShippingDistanceCache();
  const outside = await quoteShippingMethods(
    { authoritativeSubtotal: 20, shippingAddress: address },
    { distanceProvider: async () => 40.01 }
  );
  assert.equal(shippingMethod(outside, "local-urgent").available, false);
  assert.equal(shippingMethod(outside, "local-urgent").reason, "outside_coverage");
});

test("quote devuelve métodos múltiples y mantiene adapter legacy", async () => {
  await updateShippingSettings(localSettings);
  const product = await Product.create({ name: "Producto", price: 20, stock: 3, active: true });
  const response = await request(app).post("/api/shipping/quote").send({ items: [{ productId: product._id, quantity: 1 }], shippingAddress: address });
  assert.equal(response.status, 200, JSON.stringify(response.body));
  assert.deepEqual(response.body.methods.map((method) => method.methodId), ["pickup-free", "local-urgent", "parcel-standard"]);
  assert.equal(shippingMethod(response.body, "local-urgent").quote.quoteSource, "zone_fallback");
  assert.equal(shippingMethod(response.body, "parcel-standard").reason, "rates_not_configured");
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
