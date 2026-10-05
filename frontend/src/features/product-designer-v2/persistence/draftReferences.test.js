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
  variant: { variantId: "white", sizeId: "m", colorId: "white" },
};

test("referencia exacta tiene prioridad", () => {
  const exactKey = createDraftReferenceKey(document);
  const storage = createStorage({
    "designer-v2:draft-ref:product-1:generic-flat-demo:1:default": "draft-old",
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

test("cada diseño secuencial conserva referencia propia y no recupera otro paso", () => {
  const workflow = { workflowId: "ca1452de-1111-4111-8111-123456789abc", currentIndex: 1 };
  const first = createDraftReferenceKey(document, workflow);
  const second = createDraftReferenceKey(document, { ...workflow, currentIndex: 2 });
  assert.notEqual(first, second);
  const storage = createStorage({ [first]: "draft-first" });
  assert.equal(findDraftReference(storage, document, { ...workflow, currentIndex: 2 }), null);
  assert.equal(findDraftReference(storage, document), null);
  assert.deepEqual(findDraftReference(storage, document, workflow), { key: first, draftId: "draft-first", exact: true });
});
