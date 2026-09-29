import { validateDesignDocument } from "../contracts/designDocument.js";

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

export function validateDraft(draft, { template = null, productId = null } = {}) {
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
  return { valid: errors.length === 0, errors };
}

export function countDraftElements(draft) {
  return Object.values(draft?.document?.views || {}).reduce((total, view) => total + (view.elements?.length || 0), 0);
}

