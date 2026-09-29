import { GENERIC_FLAT_DEMO_TEMPLATE } from "./genericFlatDemo.js";
import { MUG_CERAMIC_STANDARD_V1_TEMPLATE } from "./mugCeramicStandardV1.js";

const templatesById = Object.freeze({
  [GENERIC_FLAT_DEMO_TEMPLATE.templateId]: GENERIC_FLAT_DEMO_TEMPLATE,
  [MUG_CERAMIC_STANDARD_V1_TEMPLATE.templateId]: MUG_CERAMIC_STANDARD_V1_TEMPLATE,
});

export function getProductTemplateById(templateId) {
  return templatesById[templateId] ?? null;
}

export function resolveProductTemplateId(product) {
  return typeof product?.productTemplateId === "string" && product.productTemplateId.trim()
    ? product.productTemplateId.trim()
    : null;
}

export function resolveProductTemplate(product) {
  const templateId = resolveProductTemplateId(product);
  return templateId ? getProductTemplateById(templateId) : null;
}
