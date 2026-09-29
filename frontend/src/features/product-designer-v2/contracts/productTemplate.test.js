import test from "node:test";
import assert from "node:assert/strict";
import { validateProductTemplate } from "./productTemplate.js";
import { GENERIC_FLAT_DEMO_TEMPLATE } from "../templates/genericFlatDemo.js";
import { MUG_CERAMIC_STANDARD_V1_TEMPLATE } from "../templates/mugCeramicStandardV1.js";

test("ProductTemplate fixture cumple el contrato v1", () => {
  assert.deepEqual(validateProductTemplate(GENERIC_FLAT_DEMO_TEMPLATE), { valid: true, errors: [] });
});

test("template piloto de taza cumple contrato sin inventar geometría física", () => {
  assert.deepEqual(validateProductTemplate(MUG_CERAMIC_STANDARD_V1_TEMPLATE), { valid: true, errors: [] });
  assert.equal(MUG_CERAMIC_STANDARD_V1_TEMPLATE.productType, "mug");
  assert.deepEqual(MUG_CERAMIC_STANDARD_V1_TEMPLATE.views.map((view) => view.id), ["wrap"]);
  const printArea = MUG_CERAMIC_STANDARD_V1_TEMPLATE.views[0].printAreas[0];
  assert.equal(printArea.physicalSize, null);
  assert.equal(printArea.safeArea, null);
  assert.equal(printArea.bleed, null);
  assert.equal(MUG_CERAMIC_STANDARD_V1_TEMPLATE.mockups.length, 0);
  assert.equal(MUG_CERAMIC_STANDARD_V1_TEMPLATE.threeD, null);
});

test("ProductTemplate inválido devuelve errores explícitos", () => {
  const result = validateProductTemplate({ schemaVersion: 99, views: [] });
  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /schemaVersion/);
  assert.match(result.errors.join(" "), /templateId/);
  assert.match(result.errors.join(" "), /al menos una vista/);
});
