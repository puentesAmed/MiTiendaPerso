import test from "node:test";
import assert from "node:assert/strict";
import { createDesignDocument } from "../contracts/designDocument.js";
import { GENERIC_FLAT_DEMO_TEMPLATE } from "../templates/genericFlatDemo.js";
import { createDraft } from "./draftModel.js";
import { addText } from "../domain/designDocumentActions.js";
import { createDraftRepository, DraftConflictError, IncompatibleDraftError } from "./DraftRepository.js";
import { createTestMemoryStorage } from "./testMemoryStorage.js";

const now = () => "2026-09-29T08:00:00.000Z";
const makeDocument = () => createDesignDocument({ template: GENERIC_FLAT_DEMO_TEMPLATE, productId: "product-1", idFactory: () => "document-1", now });

test("DraftRepository guarda, carga, detecta existencia y elimina", async () => {
  const repository = createDraftRepository(createTestMemoryStorage(), { now });
  const draft = createDraft({ draftId: "draft-1", document: makeDocument(), now });
  const saved = await repository.saveDraft(draft);
  assert.equal(saved.revision, 1);
  assert.equal(await repository.hasDraft("draft-1"), true);
  assert.equal((await repository.loadDraft("draft-1", { template: GENERIC_FLAT_DEMO_TEMPLATE, productId: "product-1" })).document.documentId, "document-1");
  await repository.deleteDraft("draft-1");
  assert.equal(await repository.hasDraft("draft-1"), false);
});

test("DraftRepository rechaza schema incompatible y revisión obsoleta", async () => {
  const repository = createDraftRepository(createTestMemoryStorage(), { now });
  const saved = await repository.saveDraft(createDraft({ draftId: "draft-1", document: makeDocument(), now }));
  await assert.rejects(() => repository.saveDraft(saved, { expectedRevision: 0 }), DraftConflictError);
  const incompatible = { ...saved, document: { ...saved.document, schemaVersion: 99 } };
  await assert.rejects(() => repository.saveDraft(incompatible, { expectedRevision: 1 }), IncompatibleDraftError);
  const overwritten = await repository.saveDraft(saved, { expectedRevision: 0, force: true });
  assert.equal(overwritten.revision, 2);
});

test("save/load conserva un documento de 20 elementos", async () => {
  const repository = createDraftRepository(createTestMemoryStorage(), { now });
  let document = makeDocument();
  for (let index = 0; index < 20; index += 1) {
    document = addText(document, { viewId: "primary", printAreaId: "primary-area", idFactory: () => `text-${index}`, now }).document;
  }
  await repository.saveDraft(createDraft({ draftId: "draft-stress", document, now }));
  const loaded = await repository.loadDraft("draft-stress", { template: GENERIC_FLAT_DEMO_TEMPLATE, productId: "product-1" });
  assert.equal(loaded.document.views.primary.elements.length, 20);
});

