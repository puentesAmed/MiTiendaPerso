import test from "node:test";
import assert from "node:assert/strict";
import { createAssetRepository } from "./AssetRepository.js";
import { createTestMemoryStorage } from "./testMemoryStorage.js";

function asset(index) {
  const blob = new Blob([`asset-${index}`], { type: "image/png" });
  return { assetId: `asset-${index}`, kind: "image", mimeType: "image/png", widthPx: 10, heightPx: 10, sizeBytes: blob.size, createdAt: "2026-09-29T08:00:00.000Z", blob };
}

test("AssetRepository persiste Blob y elimina asset", async () => {
  const repository = createAssetRepository(createTestMemoryStorage());
  const record = asset(1);
  await repository.saveAsset(record);
  assert.equal(await repository.hasAsset(record.assetId), true);
  assert.equal((await repository.loadAsset(record.assetId)).blob.size, record.blob.size);
  await repository.deleteAsset(record.assetId);
  assert.equal(await repository.hasAsset(record.assetId), false);
});

test("AssetRepository soporta 10 blobs sintéticos sin serializarlos", async () => {
  const repository = createAssetRepository(createTestMemoryStorage());
  await Promise.all(Array.from({ length: 10 }, (_, index) => repository.saveAsset(asset(index))));
  assert.equal((await repository.listAssets()).length, 10);
});

