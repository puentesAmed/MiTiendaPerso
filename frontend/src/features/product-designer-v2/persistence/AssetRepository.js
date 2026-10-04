import { ASSET_STORE } from "./indexedDbStorage.js";

export function validateAssetRecord(record) {
  const validQuality = record?.qualityStatus == null || ["good", "warning", "rejected"].includes(record.qualityStatus);
  const valid = Boolean(record?.assetId && record.kind === "image" && record.blob instanceof Blob && record.mimeType === record.blob.type && Number.isFinite(record.widthPx) && Number.isFinite(record.heightPx) && validQuality && record.sizeBytes === record.blob.size && record.createdAt);
  if (!valid) throw new Error("Asset persistente inválido.");
  return true;
}

export function createAssetRepository(storage) {
  return {
    async saveAsset(record) {
      validateAssetRecord(record);
      await storage.put(ASSET_STORE, record);
      return record;
    },
    loadAsset: (assetId) => storage.get(ASSET_STORE, assetId),
    async hasAsset(assetId) { return Boolean(await storage.get(ASSET_STORE, assetId)); },
    deleteAsset: (assetId) => storage.delete(ASSET_STORE, assetId),
    listAssets: () => storage.getAll(ASSET_STORE),
  };
}

