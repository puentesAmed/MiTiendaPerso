import { GENERIC_FLAT_DEMO_TEMPLATE } from "./genericFlatDemo.js";

const templatesById = Object.freeze({
  [GENERIC_FLAT_DEMO_TEMPLATE.templateId]: GENERIC_FLAT_DEMO_TEMPLATE,
});

// Provisional para SPEC-020A: Product aún no publica una relación ProductTemplate real.
// El editor solo recibe templateId; no contiene branching por tipo de producto.
export const DEVELOPMENT_TEMPLATE_MAPPING = Object.freeze({
  tshirt: "generic-flat-demo",
  hoodie: "generic-flat-demo",
  mug: "generic-flat-demo",
});

export function getProductTemplateById(templateId) {
  return templatesById[templateId] ?? null;
}

export function resolveProductTemplateId(product) {
  const configuredTemplateId = product?.customizationConfig?.templateId;
  if (configuredTemplateId) return configuredTemplateId;
  return DEVELOPMENT_TEMPLATE_MAPPING[product?.customizationType] ?? null;
}

export function resolveProductTemplate(product) {
  const templateId = resolveProductTemplateId(product);
  return templateId ? getProductTemplateById(templateId) : null;
}
