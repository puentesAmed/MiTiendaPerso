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

before(async () => { process.env.JWT_SECRET ||= "test-jwt-secret"; await setupTestDB(); });
beforeEach(clearTestDB);
after(teardownTestDB);

test("contrato rechaza ids inventados, duplicados y modificadores inválidos", () => {
  assert.throws(() => normalizeCustomizationPricing({ enabled: true, surfaces: [{ surfaceId: "missing", enabled: true, priceModifier: 1 }] }, "tshirt-basic-v1"), /no válida/);
  assert.throws(() => normalizeCustomizationPricing({ enabled: true, surfaces: [surfaces[0], surfaces[0]] }, "tshirt-basic-v1"), /duplicada/);
  assert.throws(() => normalizeCustomizationPricing({ enabled: true, surfaces: [{ ...surfaces[0], priceModifier: -1 }] }, "tshirt-basic-v1"), /Modificador inválido/);
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
  assert.throws(() => resolveCustomizationQuote(product, ["tshirt-front", "tshirt-front"]), /duplicadas/);
});

test("pedido ignora precio manipulado y congela base, incremento y unitario", async () => {
  const product = await Product.create({ name: "Camiseta", price: 20, stock: 10, active: true, customizable: true, productTemplateId: "tshirt-basic-v1", customizationPricing: { enabled: true, surfaces } });
  const { lines, subtotal } = await resolveAuthoritativeOrderLines([{ productId: product._id, quantity: 2, customization: { selectedSurfaceIds: ["tshirt-front", "tshirt-back"], customizationPricing: { unitPrice: 0 } } }]);
  assert.equal(subtotal, 50);
  assert.equal(lines[0].basePrice, 20);
  assert.equal(lines[0].price, 25);
  assert.equal(lines[0].customizationPricing.customizationAmount, 5);
  await assert.rejects(
    () => resolveAuthoritativeOrderLines([{ productId: product._id, quantity: 1, customization: { schemaVersion: 2, designDocument: {} } }]),
    /Selecciona las superficies/,
  );
});
