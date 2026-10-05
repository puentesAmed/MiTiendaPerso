const DRAFT_REFERENCE_PREFIX = "designer-v2:draft-ref:";

export function createDraftReferenceKey(document, workflow = null) {
  const variant = document.variant;
  const variantToken = variant
    ? [variant.variantId, variant.sizeId, variant.colorId].map((value) => value || "-").join("~")
    : "default";
  const surfaceToken = Array.isArray(document.selectedSurfaceIds)
    ? document.selectedSurfaceIds.map(encodeURIComponent).join("~")
    : "legacy";
  const baseKey = `${DRAFT_REFERENCE_PREFIX}${document.productId}:${document.templateId}:${document.templateRevision}:${variantToken}:${surfaceToken}`;
  return workflow ? `${baseKey}:workflow=${workflow.workflowId}:design=${workflow.currentIndex}` : baseKey;
}

export function findDraftReference(storage, document, workflow = null) {
  const exactKey = createDraftReferenceKey(document, workflow);
  const exactDraftId = storage.getItem(exactKey);
  if (exactDraftId) return { key: exactKey, draftId: exactDraftId, exact: true };
  if (workflow) return null;

  const productPrefix = `${DRAFT_REFERENCE_PREFIX}${document.productId}:`;
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key?.startsWith(productPrefix) || key.includes(":workflow=")) continue;
    const draftId = storage.getItem(key);
    if (draftId) return { key, draftId, exact: false };
  }
  return null;
}
