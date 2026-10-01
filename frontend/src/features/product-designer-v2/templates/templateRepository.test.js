import test from "node:test";
import assert from "node:assert/strict";
import {
  getProductTemplateById,
  resolveProductTemplate,
  resolveProductTemplateId,
} from "./templateRepository.js";
import { canUseProductDesignerV2, PRODUCT_TEMPLATE_IDS } from "./templateCatalog.js";

test("lookup resuelve el fixture por templateId", () => {
  assert.equal(getProductTemplateById(PRODUCT_TEMPLATE_IDS.GENERIC_FLAT_DEMO)?.templateId, "generic-flat-demo");
  assert.equal(getProductTemplateById(PRODUCT_TEMPLATE_IDS.MUG_CERAMIC_STANDARD_V1)?.productType, "mug");
  assert.equal(getProductTemplateById(PRODUCT_TEMPLATE_IDS.TSHIRT_BASIC_V1)?.productType, "tshirt");
  Object.values(PRODUCT_TEMPLATE_IDS).forEach((templateId) => assert.ok(getProductTemplateById(templateId)));
  assert.equal(getProductTemplateById("missing"), null);
});

test("producto piloto resuelve el template real por productTemplateId", () => {
  const product = { _id: "693070095d96fe47cd3f2055", customizable: true, productTemplateId: "mug-ceramic-standard-v1" };
  assert.equal(resolveProductTemplateId(product), "mug-ceramic-standard-v1");
  assert.equal(resolveProductTemplate(product)?.templateId, "mug-ceramic-standard-v1");
  assert.equal(canUseProductDesignerV2(product), true);
});

test("camiseta real resuelve template V2 sin fallback por nombre", () => {
  const product = { _id: "shirt-1", name: "Camiseta básica personalizada", customizable: true, productTemplateId: "tshirt-basic-v1" };
  assert.equal(resolveProductTemplate(product)?.templateId, "tshirt-basic-v1");
  assert.equal(canUseProductDesignerV2(product), true);
  assert.equal(canUseProductDesignerV2({ ...product, productTemplateId: null }), false);
});

test("template inexistente no habilita V2", () => {
  const product = { customizable: true, productTemplateId: "missing" };
  assert.equal(resolveProductTemplate(product), null);
  assert.equal(canUseProductDesignerV2(product), false);
});

test("no hay fallback por productId ni customizationType", () => {
  const product = { _id: "693070095d96fe47cd3f2055", customizable: true, customizationType: "mug" };
  assert.equal(resolveProductTemplateId(product), null);
  assert.equal(resolveProductTemplate(product), null);
  assert.equal(canUseProductDesignerV2(product), false);
  assert.equal(canUseProductDesignerV2({ ...product, productTemplateId: "generic-flat-demo" }), false);
});
