import test from "node:test";
import assert from "node:assert/strict";
import {
  getProductTemplateById,
  resolveProductTemplate,
  resolveProductTemplateId,
} from "./templateRepository.js";

test("lookup resuelve el fixture por templateId", () => {
  assert.equal(getProductTemplateById("generic-flat-demo")?.templateId, "generic-flat-demo");
  assert.equal(getProductTemplateById("missing"), null);
});

test("configuración explícita tiene prioridad sobre mapping de desarrollo", () => {
  const product = { customizationType: "unknown", customizationConfig: { templateId: "generic-flat-demo" } };
  assert.equal(resolveProductTemplateId(product), "generic-flat-demo");
  assert.equal(resolveProductTemplate(product)?.templateId, "generic-flat-demo");
});

test("producto no mapeado queda sin template compatible", () => {
  assert.equal(resolveProductTemplate({ customizationType: "unknown" }), null);
});
