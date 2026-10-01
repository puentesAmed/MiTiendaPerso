import { assertValidProductTemplate } from "./productTemplate.js";

export const DESIGN_DOCUMENT_SCHEMA_VERSION = 1;

function normalizeVariantContext(variant) {
  if (!variant) return null;
  const normalized = {
    variantId: variant.variantId ?? null,
    size: variant.size ?? null,
    sizeId: variant.sizeId ?? null,
    color: variant.color ?? null,
    colorId: variant.colorId ?? null,
  };
  return Object.values(normalized).some(Boolean) ? normalized : null;
}

export function createDesignDocument({
  template,
  productId,
  variant = null,
  idFactory = () => globalThis.crypto.randomUUID(),
  now = () => new Date().toISOString(),
}) {
  assertValidProductTemplate(template);
  if (!productId) throw new Error("No se puede crear DesignDocument sin productId.");

  const timestamp = now();
  return {
    schemaVersion: DESIGN_DOCUMENT_SCHEMA_VERSION,
    documentId: idFactory(),
    templateId: template.templateId,
    templateRevision: template.templateRevision,
    productId: String(productId),
    variant: normalizeVariantContext(variant),
    assets: {},
    views: Object.fromEntries(template.views.map((view) => [view.id, { elements: [] }])),
    metadata: { createdAt: timestamp, updatedAt: timestamp },
  };
}

export function validateDesignDocument(document, template = null) {
  const errors = [];
  if (!document || typeof document !== "object") return { valid: false, errors: ["DesignDocument debe ser un objeto."] };
  if (document.schemaVersion !== DESIGN_DOCUMENT_SCHEMA_VERSION) errors.push("schemaVersion de DesignDocument no soportado.");
  ["documentId", "templateId", "productId"].forEach((field) => {
    if (!document[field]) errors.push(`Falta ${field}.`);
  });
  if (!Number.isInteger(document.templateRevision) || document.templateRevision < 1) errors.push("templateRevision inválido.");
  if (!document.assets || typeof document.assets !== "object" || Array.isArray(document.assets)) errors.push("assets debe ser un objeto.");
  if (!document.views || typeof document.views !== "object" || Array.isArray(document.views)) errors.push("views debe ser un objeto.");
  if (!document.metadata?.createdAt || !document.metadata?.updatedAt) errors.push("metadata debe incluir createdAt y updatedAt.");
  if (template) {
    if (document.templateId !== template.templateId || document.templateRevision !== template.templateRevision) errors.push("Las referencias del template no coinciden.");
    template.views.forEach((view) => {
      if (!Array.isArray(document.views?.[view.id]?.elements)) errors.push(`La vista ${view.id} no está inicializada.`);
    });
  }
  ["fabric", "previewImage", "mockups", "png", "zoom", "selection"].forEach((forbidden) => {
    if (Object.hasOwn(document, forbidden)) errors.push(`DesignDocument no puede contener ${forbidden}.`);
  });
  return { valid: errors.length === 0, errors };
}
