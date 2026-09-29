import test from "node:test";
import assert from "node:assert/strict";
import { createDraftReferenceKey, findDraftReference } from "./draftReferences.js";

function createStorage(entries = {}) {
  const values = new Map(Object.entries(entries));
  return {
    get length() { return values.size; },
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
  };
}

const document = {
  productId: "product-1",
  templateId: "mug-ceramic-standard-v1",
  templateRevision: 1,
};

test("referencia exacta tiene prioridad", () => {
  const exactKey = createDraftReferenceKey(document);
  const storage = createStorage({
    "designer-v2:draft-ref:product-1:generic-flat-demo:1": "draft-old",
    [exactKey]: "draft-current",
  });
  assert.deepEqual(findDraftReference(storage, document), { key: exactKey, draftId: "draft-current", exact: true });
});

test("descubre draft anterior del mismo producto sin cruzar productos", () => {
  const legacyKey = "designer-v2:draft-ref:product-1:generic-flat-demo:1";
  const storage = createStorage({
    "designer-v2:draft-ref:other:generic-flat-demo:1": "draft-other",
    [legacyKey]: "draft-old",
  });
  assert.deepEqual(findDraftReference(storage, document), { key: legacyKey, draftId: "draft-old", exact: false });
});
