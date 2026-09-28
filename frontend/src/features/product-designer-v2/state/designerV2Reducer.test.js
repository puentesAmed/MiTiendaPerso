import test from "node:test";
import assert from "node:assert/strict";
import { createDesignDocument } from "../contracts/designDocument.js";
import { GENERIC_FLAT_DEMO_TEMPLATE } from "../templates/genericFlatDemo.js";
import { designerV2Reducer, initialDesignerV2State } from "./designerV2Reducer.js";

test("cambiar vista conserva DesignDocument", () => {
  const document = createDesignDocument({
    template: GENERIC_FLAT_DEMO_TEMPLATE,
    productId: "product-1",
    idFactory: () => "document-1",
    now: () => "2026-09-28T00:00:00.000Z",
  });
  const ready = designerV2Reducer(initialDesignerV2State, {
    type: "ready",
    payload: { product: { _id: "product-1" }, template: GENERIC_FLAT_DEMO_TEMPLATE, document },
  });
  const changed = designerV2Reducer(ready, { type: "view-selected", payload: "secondary" });

  assert.equal(changed.sessionState.activeViewId, "secondary");
  assert.equal(changed.documentState.document, document);
});
