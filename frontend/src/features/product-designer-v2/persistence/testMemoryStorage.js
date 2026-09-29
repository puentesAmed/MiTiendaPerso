import { StorageConflictError } from "./indexedDbStorage.js";

export function createTestMemoryStorage() {
  const stores = { drafts: new Map(), assets: new Map() };
  return {
    async get(store, key) { return stores[store].get(key) ?? null; },
    async getAll(store) { return [...stores[store].values()]; },
    async put(store, value) { stores[store].set(value.draftId || value.assetId, value); return value; },
    async delete(store, key) { stores[store].delete(key); },
    async compareAndPutDraft(value, { expectedRevision = null, force = false } = {}) {
      const current = stores.drafts.get(value.draftId);
      if (!force && ((current && current.revision !== expectedRevision) || (!current && expectedRevision !== null))) throw new StorageConflictError();
      const saved = { ...value, revision: (current?.revision || 0) + 1 };
      stores.drafts.set(saved.draftId, saved);
      return saved;
    },
  };
}

