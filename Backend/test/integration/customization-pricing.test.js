import test, { after, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { Product } from "../../src/models/Product.js";
import { normalizeCustomizationPricing, resolveCustomizationQuote } from "../../src/services/customization-pricing.service.js";
import { resolveAuthoritativeOrderLines } from "../../src/services/order-calculation.service.js";
import { clearTestDB, setupTestDB, teardownTestDB } from "../setup/test-db.js";
import { createAdminAuthHeader } from "../setup/test-auth.js";

const app = createApp();
const surfaces = [
  { surfaceId: "tshirt-front", enabled: true, required: true, priceModifier: 0 },
  { surfaceId: "tshirt-back", enabled: true, required: false, priceModifier: 5 },
  { surfaceId: "tshirt-sleeve-left", enabled: false, required: false, priceModifier: null },
  { surfaceId: "tshirt-sleeve-right", enabled: false, required: false, priceModifier: null },
];

function v2Customization(product, selectedSurfaceIds, customizationPricing = null) {
  const templateRevision = product.productTemplateId === "tshirt-basic-v1" ? 2 : 1;
  const surfaceToView = { "tshirt-front": "front", "tshirt-back": "back", "wrap-main": "wrap" };
  const viewIds = selectedSurfaceIds.map((surfaceId) => surfaceToView[surfaceId]).filter(Boolean);
  return {
    type: "designer",
    schemaVersion: 2,
    designVersion: 2,
    clientId: "client-pricing-test",
    productId: product._id.toString(),
    selectedSurfaceIds,
    customizationPricing,
    designDocument: {
      schemaVersion: 1,
      documentId: "document-pricing-test",
      productId: product._id.toString(),
      templateId: product.productTemplateId,
      templateRevision,
      selectedSurfaceIds,
      assets: {},
      views: Object.fromEntries(viewIds.map((viewId) => [viewId, { elements: [] }])),
      metadata: { createdAt: "2026-10-04T08:00:00.000Z", updatedAt: "2026-10-04T08:00:00.000Z" },
    },
    uploads: {
      assets: {},
      surfaces: Object.fromEntries(viewIds.map((viewId) => [viewId, { artworkUploadId: `artwork-${viewId}`, proofUploadId: `proof-${viewId}` }])),
    },
  };
}

before(async () => { process.env.JWT_SECRET ||= "test-jwt-secret"; await setupTestDB(); });
beforeEach(clearTestDB);
after(teardownTestDB);

test("contrato rechaza ids inventados, duplicados y modificadores inválidos", () => {
  assert.throws(() => normalizeCustomizationPricing({ enabled: true, surfaces: [{ surfaceId: "missing", enabled: true, priceModifier: 1 }] }, "tshirt-basic-v1"), /no válida/);
  assert.throws(() => normalizeCustomizationPricing({ enabled: true, surfaces: [surfaces[0], surfaces[0]] }, "tshirt-basic-v1"), /duplicada/);
  assert.throws(() => normalizeCustomizationPricing({ enabled: true, surfaces: [{ ...surfaces[0], priceModifier: -1 }] }, "tshirt-basic-v1"), /Modificador inválido/);
  assert.throws(() => normalizeCustomizationPricing({ enabled: "false", surfaces }, "tshirt-basic-v1"), /booleano/);
});

test("Admin guarda configuración declarativa y detalle público solo expone superficies disponibles", async () => {
  const authorization = await createAdminAuthHeader();
  const response = await request(app).post("/api/products").set("Authorization", authorization).send({
    name: "Camiseta configurable", price: 20, stock: 10, active: true, customizable: true,
    productTemplateId: "tshirt-basic-v1", variants: { sizes: ["M"], colors: ["Blanco"] },
    customizationPricing: { enabled: true, surfaces },
  });
  assert.equal(response.status, 201, JSON.stringify(response.body));
  const stored = await Product.findById(response.body.product._id).lean();
  assert.equal(stored.customizationPricing.surfaces[0].priceModifier, 0);
  assert.equal(stored.customizationPricing.surfaces[1].priceModifier, 5);

  const detail = await request(app).get(`/api/products/${stored._id}`);
  assert.deepEqual(detail.body.product.customizationPricing.surfaces.map((surface) => surface.surfaceId), ["tshirt-front", "tshirt-back"]);
  assert.deepEqual(detail.body.product.customizationPricing.surfaces.map((surface) => surface.enabled), [true, true]);
});

test("GET taza conserva enabled y priceModifier cero para wrap-main", async () => {
  const product = await Product.create({
    name: "Taza cerámica personalizada", price: 12.5, stock: 10, active: true, customizable: true,
    productTemplateId: "mug-ceramic-standard-v1",
    customizationPricing: { enabled: true, surfaces: [{ surfaceId: "wrap-main", enabled: true, required: true, priceModifier: 0 }] },
  });
  const response = await request(app).get(`/api/products/${product._id}`);
  assert.equal(response.status, 200);
  assert.deepEqual(response.body.product.customizationPricing, {
    enabled: true,
    surfaces: [{ surfaceId: "wrap-main", label: "Diseño envolvente", enabled: true, required: true, priceModifier: 0 }],
  });
  const pendingPrice = await Product.create({
    name: "Taza sin precio de personalización", price: 12.5, stock: 10, active: true, customizable: true,
    productTemplateId: "mug-ceramic-standard-v1",
    customizationPricing: { enabled: true, surfaces: [{ surfaceId: "wrap-main", enabled: true, required: false, priceModifier: null }] },
  });
  const pendingResponse = await request(app).get(`/api/products/${pendingPrice._id}`);
  assert.equal(pendingResponse.body.product.customizationPricing, null);
});

test("quote valida selección y calcula precio autoritativo", async () => {
  const product = await Product.create({ name: "Camiseta", price: 20, stock: 10, active: true, customizable: true, productTemplateId: "tshirt-basic-v1", variants: { sizes: ["M"], colors: ["Blanco"] }, customizationPricing: { enabled: true, surfaces } });
  const quoted = await request(app).post(`/api/products/${product._id}/customization-quote`).send({ selectedSurfaceIds: ["tshirt-front", "tshirt-back"], variant: { size: "M", color: "Blanco" } });
  assert.equal(quoted.status, 200, JSON.stringify(quoted.body));
  assert.deepEqual(quoted.body.quote, {
    basePrice: 20, customizationAmount: 5, unitPrice: 25, currency: "EUR",
    selectedSurfaceIds: ["tshirt-front", "tshirt-back"],
    selectedSurfaces: [
      { surfaceId: "tshirt-front", label: "Frontal", required: true, priceModifier: 0 },
      { surfaceId: "tshirt-back", label: "Trasera", required: false, priceModifier: 5 },
    ],
  });
  assert.equal((await request(app).post(`/api/products/${product._id}/customization-quote`).send({ selectedSurfaceIds: ["tshirt-back"], variant: { size: "M", color: "Blanco" } })).status, 400);
  assert.equal((await request(app).post(`/api/products/${product._id}/customization-quote`).send({ selectedSurfaceIds: [], variant: { size: "M", color: "Blanco" } })).status, 400);
  assert.equal((await request(app).post(`/api/products/${product._id}/customization-quote`).send({ selectedSurfaceIds: ["tshirt-front", "tshirt-sleeve-left"], variant: { size: "M", color: "Blanco" } })).status, 400);
  assert.throws(() => resolveCustomizationQuote(product, ["tshirt-front", "tshirt-front"]), /duplicadas/);
});

test("pedido ignora precio manipulado y congela base, incremento y unitario", async () => {
  const product = await Product.create({ name: "Camiseta", price: 20, stock: 10, active: true, customizable: true, productTemplateId: "tshirt-basic-v1", customizationPricing: { enabled: true, surfaces } });
  const manipulatedPrice = { unitPrice: 0, selectedSurfaceIds: ["tshirt-front", "tshirt-back"] };
  const { lines, subtotal } = await resolveAuthoritativeOrderLines([{ productId: product._id, quantity: 2, customization: v2Customization(product, ["tshirt-front", "tshirt-back"], manipulatedPrice) }]);
  assert.equal(subtotal, 50);
  assert.equal(lines[0].basePrice, 20);
  assert.equal(lines[0].price, 25);
  assert.equal(lines[0].customizationPricing.customizationAmount, 5);
  await assert.rejects(
    () => resolveAuthoritativeOrderLines([{ productId: product._id, quantity: 1, customization: { type: "designer", schemaVersion: 2, designVersion: 2, clientId: "incomplete" } }]),
    /personalización válida/,
  );
  await assert.rejects(
    () => resolveAuthoritativeOrderLines([{ productId: product._id, quantity: 1, customization: v2Customization(product, ["tshirt-back"]) }]),
    (error) => error.name === "OrderCalculationError" && error.status === 400 && /obligatoria/.test(error.message),
  );
  await assert.rejects(
    () => resolveAuthoritativeOrderLines([{ productId: product._id, quantity: 1, customization: null }]),
    /requiere una personalización válida/,
  );
  const normal = await Product.create({ name: "Producto normal", price: 10, stock: 2, active: true, customizable: false });
  const normalResult = await resolveAuthoritativeOrderLines([{ productId: normal._id, quantity: 1, customization: null }]);
  assert.equal(normalResult.subtotal, 10);
});
