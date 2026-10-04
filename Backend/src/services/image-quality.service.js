export const IMAGE_QUALITY_STATUSES = Object.freeze(["good", "warning", "rejected"]);

export const IMAGE_QUALITY_THRESHOLDS = Object.freeze({
  rejected: Object.freeze({ minDimensionPx: 320, minAreaPx: 250_000 }),
  good: Object.freeze({ minDimensionPx: 480, minAreaPx: 1_500_000 }),
});

export function evaluateImageQuality({ widthPx, heightPx } = {}) {
  if (!Number.isFinite(widthPx) || widthPx <= 0 || !Number.isFinite(heightPx) || heightPx <= 0) return null;
  const minDimensionPx = Math.min(widthPx, heightPx);
  const areaPx = widthPx * heightPx;
  if (minDimensionPx < IMAGE_QUALITY_THRESHOLDS.rejected.minDimensionPx || areaPx < IMAGE_QUALITY_THRESHOLDS.rejected.minAreaPx) return "rejected";
  if (minDimensionPx >= IMAGE_QUALITY_THRESHOLDS.good.minDimensionPx && areaPx >= IMAGE_QUALITY_THRESHOLDS.good.minAreaPx) return "good";
  return "warning";
}

export function validateAssetQuality(metadata) {
  if (metadata?.qualityStatus == null) return { valid: true, historical: true };
  if (!IMAGE_QUALITY_STATUSES.includes(metadata.qualityStatus)) return { valid: false, reason: "invalid_status" };
  const evaluatedStatus = evaluateImageQuality(metadata);
  if (!evaluatedStatus) return { valid: false, reason: "invalid_dimensions" };
  if (metadata.qualityStatus === "rejected") return { valid: false, reason: "rejected" };
  if (metadata.qualityStatus !== evaluatedStatus) return { valid: false, reason: "status_mismatch" };
  return { valid: true, historical: false };
}
