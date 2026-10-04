import test from "node:test";
import assert from "node:assert/strict";
import { createDesignDocument } from "../contracts/designDocument.js";
import { GENERIC_FLAT_DEMO_TEMPLATE } from "../templates/genericFlatDemo.js";
import { MUG_CERAMIC_STANDARD_V1_TEMPLATE } from "../templates/mugCeramicStandardV1.js";
import { TSHIRT_BASIC_V1_TEMPLATE } from "../templates/tshirtBasicV1.js";
import { createDraft } from "./draftModel.js";
import { addImage, addText } from "../domain/designDocumentActions.js";
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

test("draft generic-flat previo es incompatible con el template real de taza", async () => {
  const repository = createDraftRepository(createTestMemoryStorage(), { now });
  await repository.saveDraft(createDraft({ draftId: "draft-generic", document: makeDocument(), now }));
  await assert.rejects(
    () => repository.loadDraft("draft-generic", { template: MUG_CERAMIC_STANDARD_V1_TEMPLATE, productId: "product-1" }),
    IncompatibleDraftError,
  );
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

test("draft conserva qualityStatus del asset sin recalcularlo", async () => {
  const repository = createDraftRepository(createTestMemoryStorage(), { now });
  const asset = { assetId: "image-warning", kind: "image", mimeType: "image/png", widthPx: 1008, heightPx: 480, qualityStatus: "warning", sizeBytes: 24, createdAt: now() };
  const document = addImage(makeDocument(), { viewId: "primary", printAreaId: "primary-area", asset, idFactory: () => "image-element", now }).document;
  await repository.saveDraft(createDraft({ draftId: "draft-quality", document, now }));
  const loaded = await repository.loadDraft("draft-quality", { template: GENERIC_FLAT_DEMO_TEMPLATE, productId: "product-1" });
  assert.equal(loaded.document.assets[asset.assetId].qualityStatus, "warning");
});

test("no restaura silenciosamente un draft de otra variante", async () => {
  const repository = createDraftRepository(createTestMemoryStorage(), { now });
  const white = createDesignDocument({ template: GENERIC_FLAT_DEMO_TEMPLATE, productId: "shirt-1", variant: { variantId: "white", colorId: "white", color: "Blanco", size: "M", sizeId: "m" }, idFactory: () => "white-document", now });
  await repository.saveDraft(createDraft({ draftId: "shirt-white", document: white, now }));
  await assert.rejects(
    () => repository.loadDraft("shirt-white", { template: GENERIC_FLAT_DEMO_TEMPLATE, productId: "shirt-1", variant: { variantId: "black", colorId: "black", color: "Negro", size: "M", sizeId: "m" } }),
    /otra variante/,
  );
});

test("migra draft camiseta revision 1 preservando FRONT/BACK y crea mangas vacías", async () => {
  const repository = createDraftRepository(createTestMemoryStorage(), { now });
  const current = createDesignDocument({ template: TSHIRT_BASIC_V1_TEMPLATE, productId: "shirt-1", idFactory: () => "shirt-document", now });
  const legacyDocument = {
    ...current,
    templateRevision: 1,
    views: { front: { elements: [{ id: "front-existing" }] }, back: { elements: [{ id: "back-existing" }] } },
  };
  await repository.saveDraft(createDraft({ draftId: "shirt-v1", document: legacyDocument, now }));
  const migrated = await repository.loadDraft("shirt-v1", { template: TSHIRT_BASIC_V1_TEMPLATE, productId: "shirt-1" });
  assert.equal(migrated.templateRevision, 2);
  assert.equal(migrated.document.views.front.elements[0].id, "front-existing");
  assert.equal(migrated.document.views.back.elements[0].id, "back-existing");
  assert.deepEqual(migrated.document.views["sleeve-left"], { elements: [] });
  assert.deepEqual(migrated.document.views["sleeve-right"], { elements: [] });
});

