import test from "node:test";
import assert from "node:assert/strict";
import { validateProductTemplate } from "./productTemplate.js";
import { GENERIC_FLAT_DEMO_TEMPLATE } from "../templates/genericFlatDemo.js";

test("ProductTemplate fixture cumple el contrato v1", () => {
  assert.deepEqual(validateProductTemplate(GENERIC_FLAT_DEMO_TEMPLATE), { valid: true, errors: [] });
});

test("ProductTemplate inválido devuelve errores explícitos", () => {
  const result = validateProductTemplate({ schemaVersion: 99, views: [] });
  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /schemaVersion/);
  assert.match(result.errors.join(" "), /templateId/);
  assert.match(result.errors.join(" "), /al menos una vista/);
});
