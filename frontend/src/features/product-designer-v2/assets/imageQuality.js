export const IMAGE_QUALITY_STATUSES = Object.freeze(["good", "warning", "rejected"]);

export const IMAGE_QUALITY_THRESHOLDS = Object.freeze({
  rejected: Object.freeze({ minDimensionPx: 320, minAreaPx: 250_000 }),
  good: Object.freeze({ minDimensionPx: 480, minAreaPx: 1_500_000 }),
});

export const IMAGE_QUALITY_COPY = Object.freeze({
  good: Object.freeze({ title: "✓ Buena calidad", description: "Imagen apta para personalización." }),
  warning: Object.freeze({ title: "⚠ Calidad justa", description: "Recomendamos usar una imagen de mayor resolución." }),
  rejected: Object.freeze({ title: "✕ Calidad insuficiente", description: "Sube una imagen de mayor calidad para continuar." }),
});

export function evaluateImageQuality({ widthPx, heightPx } = {}) {
  if (!Number.isFinite(widthPx) || widthPx <= 0 || !Number.isFinite(heightPx) || heightPx <= 0) {
    throw new Error("La imagen no tiene dimensiones válidas.");
  }
  const minDimensionPx = Math.min(widthPx, heightPx);
  const areaPx = widthPx * heightPx;
  if (minDimensionPx < IMAGE_QUALITY_THRESHOLDS.rejected.minDimensionPx || areaPx < IMAGE_QUALITY_THRESHOLDS.rejected.minAreaPx) return "rejected";
  if (minDimensionPx >= IMAGE_QUALITY_THRESHOLDS.good.minDimensionPx && areaPx >= IMAGE_QUALITY_THRESHOLDS.good.minAreaPx) return "good";
  return "warning";
}

export function getReferencedImageAssets(document) {
  const referencedIds = new Set(Object.values(document?.views || {}).flatMap((view) =>
    (view?.elements || []).filter((element) => element?.type === "image").map((element) => element.assetId),
  ));
  return [...referencedIds].map((assetId) => document?.assets?.[assetId]).filter(Boolean);
}

export function assertNoRejectedImageAssets(document) {
  if (getReferencedImageAssets(document).some((asset) => asset.qualityStatus === "rejected")) {
    throw new Error(IMAGE_QUALITY_COPY.rejected.description);
  }
  return true;
}
