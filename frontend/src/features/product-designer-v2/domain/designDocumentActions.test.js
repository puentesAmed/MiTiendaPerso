import test from "node:test";
import assert from "node:assert/strict";
import { createDesignDocument } from "../contracts/designDocument.js";
import { GENERIC_FLAT_DEMO_TEMPLATE } from "../templates/genericFlatDemo.js";
import { addImage, addText, deleteElement, duplicateElement, isElementOutOfBounds, updateElement } from "./designDocumentActions.js";

const now = () => "2026-09-28T12:00:00.000Z";
const makeDocument = () => createDesignDocument({ template: GENERIC_FLAT_DEMO_TEMPLATE, productId: "product-1", idFactory: () => "document-1", now });

test("addText crea un elemento válido, centrado y al frente", () => {
  const result = addText(makeDocument(), { viewId: "primary", printAreaId: "primary-area", idFactory: () => "text-1", now });
  assert.equal(result.element.content, "Tu texto");
  assert.equal(result.element.x + result.element.width / 2, 0.5);
  assert.equal(result.element.zIndex, 0);
  assert.equal(result.document.views.primary.elements.length, 1);
  assert.equal(result.document.views.secondary.elements.length, 0);
});

test("addImage guarda metadata por assetId sin Object URL", () => {
  const asset = { assetId: "asset-1", kind: "image", mimeType: "image/png", widthPx: 800, heightPx: 400, sizeBytes: 10 };
  const result = addImage(makeDocument(), { viewId: "secondary", printAreaId: "secondary-area", asset, aspectRatio: 2, printAreaAspectRatio: 1.2, idFactory: () => "image-1", now });
  assert.equal(result.element.assetId, "asset-1");
  assert.equal((result.element.width * 1.2) / result.element.height, 2);
  assert.deepEqual(result.document.assets["asset-1"], asset);
  assert.equal("objectUrl" in result.document.assets["asset-1"], false);
});

test("update, duplicate y delete preservan zIndex y referencias", () => {
  const first = addText(makeDocument(), { viewId: "primary", printAreaId: "primary-area", idFactory: () => "text-1", now });
  const updated = updateElement(first.document, { viewId: "primary", elementId: "text-1", patch: { rotation: 27, x: -0.1 }, now });
  assert.equal(updated.element.rotation, 27);
  assert.equal(isElementOutOfBounds(updated.element), true);
  const duplicated = duplicateElement(updated.document, { viewId: "primary", elementId: "text-1", idFactory: () => "text-2", now });
  assert.equal(duplicated.element.zIndex, 1);
  assert.equal(duplicated.element.x, -0.07);
  const deleted = deleteElement(duplicated.document, { viewId: "primary", elementId: "text-1", now });
  assert.deepEqual(deleted.document.views.primary.elements.map((element) => element.id), ["text-2"]);
});

test("delete elimina metadata solo al desaparecer la última referencia", () => {
  const asset = { assetId: "asset-1", kind: "image", mimeType: "image/png", widthPx: 100, heightPx: 100, sizeBytes: 10 };
  const added = addImage(makeDocument(), { viewId: "primary", printAreaId: "primary-area", asset, aspectRatio: 1, idFactory: () => "image-1", now });
  const duplicated = duplicateElement(added.document, { viewId: "primary", elementId: "image-1", idFactory: () => "image-2", now });
  const oneRemoved = deleteElement(duplicated.document, { viewId: "primary", elementId: "image-1", now });
  assert.ok(oneRemoved.document.assets["asset-1"]);
  const allRemoved = deleteElement(oneRemoved.document, { viewId: "primary", elementId: "image-2", now });
  assert.equal(allRemoved.document.assets["asset-1"], undefined);
});
