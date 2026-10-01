import { DRAFT_STORE, StorageConflictError } from "./indexedDbStorage.js";
import { migrateDraftToTemplate, validateDraft } from "./draftModel.js";

export class IncompatibleDraftError extends Error {
  constructor(errors, draft = null) {
    super(`Draft incompatible: ${errors.join(" ")}`);
    this.name = "IncompatibleDraftError";
    this.errors = errors;
    this.draft = draft;
  }
}

export class DraftConflictError extends Error {
  constructor() {
    super("El diseño fue modificado en otra pestaña.");
    this.name = "DraftConflictError";
  }
}

export function createDraftRepository(storage, { now = () => new Date().toISOString() } = {}) {
  return {
    async saveDraft(draft, { expectedRevision = null, force = false } = {}) {
      const candidate = { ...draft, updatedAt: now(), assetIds: Object.keys(draft.document.assets || {}) };
      const validation = validateDraft(candidate);
      if (!validation.valid) throw new IncompatibleDraftError(validation.errors, candidate);
      try {
        return await storage.compareAndPutDraft(candidate, { expectedRevision, force });
      } catch (error) {
        if (error instanceof StorageConflictError || error?.name === "StorageConflictError") throw new DraftConflictError();
        throw error;
      }
    },
    async loadDraft(draftId, compatibility = {}) {
      const storedDraft = await storage.get(DRAFT_STORE, draftId);
      if (!storedDraft) return null;
      const draft = migrateDraftToTemplate(storedDraft, compatibility.template);
      const validation = validateDraft(draft, compatibility);
      if (!validation.valid) throw new IncompatibleDraftError(validation.errors, storedDraft);
      return draft;
    },
    deleteDraft: (draftId) => storage.delete(DRAFT_STORE, draftId),
    async hasDraft(draftId) { return Boolean(await storage.get(DRAFT_STORE, draftId)); },
    listDrafts: () => storage.getAll(DRAFT_STORE),
  };
}

