import test from "node:test";
import assert from "node:assert/strict";
import { calculateOrderPreparation, normalizeFulfillmentProfile } from "../../src/services/fulfillment.service.js";

test("fulfillmentProfile nullable acepta enteros y no inventa plazos", () => {
  assert.equal(normalizeFulfillmentProfile(null), null);
  assert.deepEqual(normalizeFulfillmentProfile({ preparationRequired: false, preparationMinDays: null, preparationMaxDays: null }), {
    preparationRequired: false,
    preparationMinDays: null,
    preparationMaxDays: null,
  });
  assert.deepEqual(normalizeFulfillmentProfile({ preparationRequired: true, preparationMinDays: 0, preparationMaxDays: 0 }), {
    preparationRequired: true,
    preparationMinDays: 0,
    preparationMaxDays: 0,
  });
});

test("fulfillmentProfile rechaza rangos incompletos, negativos, decimales e invertidos", () => {
  const invalid = [
    { preparationRequired: true, preparationMinDays: 1, preparationMaxDays: null },
    { preparationRequired: true, preparationMinDays: null, preparationMaxDays: 2 },
    { preparationRequired: true, preparationMinDays: -1, preparationMaxDays: 2 },
    { preparationRequired: true, preparationMinDays: 1.5, preparationMaxDays: 2 },
    { preparationRequired: true, preparationMinDays: 3, preparationMaxDays: 2 },
    { preparationRequired: "true", preparationMinDays: 1, preparationMaxDays: 2 },
  ];
  for (const profile of invalid) assert.throws(() => normalizeFulfillmentProfile(profile));
});

test("preparación del pedido usa máximos y marca cualquier plazo pendiente", () => {
  const configured = calculateOrderPreparation([
    { productId: "a", name: "A", product: { fulfillmentProfile: { preparationRequired: true, preparationMinDays: 1, preparationMaxDays: 2 } } },
    { productId: "b", name: "B", product: { fulfillmentProfile: { preparationRequired: true, preparationMinDays: 3, preparationMaxDays: 5 } } },
  ]);
  assert.deepEqual({ status: configured.status, minDays: configured.minDays, maxDays: configured.maxDays }, { status: "configured", minDays: 3, maxDays: 5 });

  const pending = calculateOrderPreparation([
    { productId: "a", name: "A", product: { fulfillmentProfile: { preparationRequired: true, preparationMinDays: 1, preparationMaxDays: 2 } } },
    { productId: "b", name: "B", product: { fulfillmentProfile: { preparationRequired: true, preparationMinDays: null, preparationMaxDays: null } } },
  ]);
  assert.deepEqual({ status: pending.status, minDays: pending.minDays, maxDays: pending.maxDays }, { status: "pending_confirmation", minDays: null, maxDays: null });
});
