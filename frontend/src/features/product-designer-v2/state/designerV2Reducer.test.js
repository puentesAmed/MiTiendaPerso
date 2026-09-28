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
  assert.equal(changed.historyState.past.length, 0);
});

test("selección y viewport son sesión; editar y undo/redo son historial", () => {
  const document = createDesignDocument({ template: GENERIC_FLAT_DEMO_TEMPLATE, productId: "product-1", idFactory: () => "document-1", now: () => "2026-09-28T00:00:00.000Z" });
  let state = designerV2Reducer(initialDesignerV2State, { type: "ready", payload: { product: {}, template: GENERIC_FLAT_DEMO_TEMPLATE, document } });
  state = designerV2Reducer(state, { type: "selection-changed", payload: ["not-in-document"] });
  state = designerV2Reducer(state, { type: "viewport-changed", payload: { zoom: 1.5, pan: { x: 12, y: 4 } } });
  assert.equal(state.historyState.past.length, 0);
  state = designerV2Reducer(state, { type: "text-added", payload: { viewId: "primary", printAreaId: "primary-area", idFactory: () => "text-1" } });
  assert.equal(state.historyState.past.length, 1);
  assert.equal(state.sessionState.dirty, true);
  state = designerV2Reducer(state, { type: "undo" });
  assert.equal(state.documentState.document.views.primary.elements.length, 0);
  state = designerV2Reducer(state, { type: "redo" });
  assert.equal(state.documentState.document.views.primary.elements.length, 1);
});

test("undo documental cruza vistas sin cambiar la vista activa", () => {
  const document = createDesignDocument({ template: GENERIC_FLAT_DEMO_TEMPLATE, productId: "product-1", idFactory: () => "document-1", now: () => "2026-09-28T00:00:00.000Z" });
  let state = designerV2Reducer(initialDesignerV2State, { type: "ready", payload: { product: {}, template: GENERIC_FLAT_DEMO_TEMPLATE, document } });
  state = designerV2Reducer(state, { type: "view-selected", payload: "secondary" });
  state = designerV2Reducer(state, { type: "text-added", payload: { viewId: "secondary", printAreaId: "secondary-area", idFactory: () => "text-secondary" } });
  state = designerV2Reducer(state, { type: "view-selected", payload: "primary" });
  state = designerV2Reducer(state, { type: "undo" });
  assert.equal(state.sessionState.activeViewId, "primary");
  assert.equal(state.documentState.document.views.secondary.elements.length, 0);
});
