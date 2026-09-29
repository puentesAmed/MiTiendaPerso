import test from "node:test";
import assert from "node:assert/strict";
import { createIndexedDbStorage, isQuotaError, StorageUnavailableError } from "./indexedDbStorage.js";

test("IndexedDB unavailable produce fallback controlable", async () => {
  const storage = createIndexedDbStorage({ indexedDBImpl: null });
  await assert.rejects(() => storage.get("drafts", "draft-1"), StorageUnavailableError);
});

test("normaliza errores de cuota conocidos", () => {
  assert.equal(isQuotaError({ name: "QuotaExceededError" }), true);
  assert.equal(isQuotaError({ code: 22 }), true);
  assert.equal(isQuotaError(new Error("otro")), false);
});
