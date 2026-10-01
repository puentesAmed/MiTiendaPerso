import { validateDesignDocument } from "../contracts/designDocument.js";
import { sameDesignerVariant } from "../domain/variantContext.js";

export function createDraft({
  draftId = globalThis.crypto.randomUUID(),
  document,
  now = () => new Date().toISOString(),
} = {}) {
  const timestamp = now();
  return {
    draftId,
    productId: document.productId,
    templateId: document.templateId,
    templateRevision: document.templateRevision,
    document,
    createdAt: timestamp,
    updatedAt: timestamp,
    assetIds: Object.keys(document.assets || {}),
    revision: 0,
  };
}

export function validateDraft(draft, { template = null, productId = null, variant = undefined } = {}) {
  const errors = [];
  if (!draft || typeof draft !== "object") return { valid: false, errors: ["Draft inválido."] };
  if (!draft.draftId) errors.push("Falta draftId.");
  if (!draft.productId || !draft.templateId) errors.push("Faltan referencias de producto/template.");
  if (!Number.isInteger(draft.templateRevision) || draft.templateRevision < 1) errors.push("templateRevision inválido.");
  if (!Array.isArray(draft.assetIds)) errors.push("assetIds debe ser un array.");
  if (!draft.createdAt || !draft.updatedAt) errors.push("Faltan timestamps del draft.");
  if (!Number.isInteger(draft.revision) || draft.revision < 0) errors.push("revision inválida.");
  const documentValidation = validateDesignDocument(draft.document, template);
  errors.push(...documentValidation.errors);
  if (draft.document?.productId !== draft.productId || draft.document?.templateId !== draft.templateId || draft.document?.templateRevision !== draft.templateRevision) errors.push("Draft y DesignDocument no coinciden.");
  if (productId && String(draft.productId) !== String(productId)) errors.push("El draft pertenece a otro producto.");
  if (variant !== undefined && !sameDesignerVariant(draft.document?.variant, variant)) errors.push("El draft pertenece a otra variante del producto.");
  return { valid: errors.length === 0, errors };
}

export function migrateDraftToTemplate(draft, template) {
  if (!draft || !template || draft.templateId !== template.templateId || draft.templateRevision === template.templateRevision) return draft;
  const migration = template.draftMigration;
  if (!migration?.initializeMissingViews || !migration.compatibleRevisions?.includes(draft.templateRevision)) return draft;
  const views = Object.fromEntries(template.views.map((view) => [view.id, draft.document?.views?.[view.id] ?? { elements: [] }]));
  const document = { ...draft.document, templateRevision: template.templateRevision, views };
  return { ...draft, templateRevision: template.templateRevision, document, assetIds: Object.keys(document.assets || {}) };
}

export function countDraftElements(draft) {
  return Object.values(draft?.document?.views || {}).reduce((total, view) => total + (view.elements?.length || 0), 0);
}

