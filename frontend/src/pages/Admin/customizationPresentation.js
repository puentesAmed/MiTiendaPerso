export function getAdminCustomizationPresentation(customization) {
  const isV2 = customization?.schemaVersion === 2;
  const surfaces = isV2 ? customization.productionSurfaces || [] : [];
  return {
    isV2,
    product: customization?.productSnapshot?.name || customization?.productName || customization?.productId?.name || "Producto",
    preview: isV2
      ? surfaces.find((surface) => surface.preview?.url)?.preview?.url || null
      : customization?.previewLowQuality || customization?.previewImage || customization?.previewsBySide?.front || customization?.previewsBySide?.back || null,
    status: customization?.productionStatus || customization?.status || "pending",
    bundleReady: isV2 ? Boolean(customization?.productionBundle?.available) : Boolean(customization?.zipUrl),
    surfaces,
  };
}

const NEXT_STATUS = Object.freeze({
  pending: Object.freeze(["issue"]),
  ready: Object.freeze(["in_production", "issue"]),
  in_production: Object.freeze(["completed", "issue"]),
  completed: Object.freeze([]),
  issue: Object.freeze(["pending"]),
});

export function getProductionStatusTargets(status) {
  return NEXT_STATUS[status] || [];
}
