import test from "node:test";
import assert from "node:assert/strict";
import { createDesignDocument } from "../contracts/designDocument.js";
import { GENERIC_FLAT_DEMO_TEMPLATE } from "../templates/genericFlatDemo.js";
import { addImage, addText, calculateInitialImageBounds, deleteElement, deleteElements, duplicateElement, isElementOutOfBounds, moveElementLayer, updateElement, updateElements } from "./designDocumentActions.js";

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

test("image fit contiene landscape, portrait y square, los centra y preserva ratio", () => {
  const printAreaPixelSize = { width: 1000, height: 500 };
  const landscape = calculateInitialImageBounds({ widthPx: 4000, heightPx: 2000, printAreaAspectRatio: 2, printAreaPixelSize });
  const portrait = calculateInitialImageBounds({ widthPx: 2000, heightPx: 4000, printAreaAspectRatio: 2, printAreaPixelSize });
  const square = calculateInitialImageBounds({ widthPx: 2000, heightPx: 2000, printAreaAspectRatio: 2, printAreaPixelSize });
  [landscape, portrait, square].forEach((bounds) => {
    assert.ok(bounds.width <= 0.75 && bounds.height <= 0.75);
    assert.equal(bounds.x, (1 - bounds.width) / 2);
    assert.equal(bounds.y, (1 - bounds.height) / 2);
  });
  assert.equal((landscape.width * 2) / landscape.height, 2);
  assert.equal((portrait.width * 2) / portrait.height, 0.5);
  assert.equal((square.width * 2) / square.height, 1);
});

test("image fit no amplía una imagen menor que la resolución editorial", () => {
  const bounds = calculateInitialImageBounds({ widthPx: 100, heightPx: 50, printAreaAspectRatio: 2, printAreaPixelSize: { width: 1000, height: 500 } });
  assert.equal(bounds.width, 0.1);
  assert.equal(bounds.height, 0.1);
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

test("reorder normaliza zIndex y lock/hide se persisten", () => {
  const first = addText(makeDocument(), { viewId: "primary", printAreaId: "primary-area", idFactory: () => "text-1", now });
  const second = addText(first.document, { viewId: "primary", printAreaId: "primary-area", idFactory: () => "text-2", now });
  const locked = updateElement(second.document, { viewId: "primary", elementId: "text-1", patch: { locked: true, hidden: true }, now });
  const moved = moveElementLayer(locked.document, { viewId: "primary", elementId: "text-1", direction: "forward", now });
  assert.deepEqual(moved.document.views.primary.elements.map(({ id, zIndex }) => [id, zIndex]), [["text-2", 0], ["text-1", 1]]);
  assert.equal(moved.moved.locked, true);
  assert.equal(moved.moved.hidden, true);
});

test("batch update y delete realizan una única revisión documental", () => {
  const first = addText(makeDocument(), { viewId: "primary", printAreaId: "primary-area", idFactory: () => "text-1", now });
  const second = addText(first.document, { viewId: "primary", printAreaId: "primary-area", idFactory: () => "text-2", now });
  const updated = updateElements(second.document, { viewId: "primary", updates: [
    { elementId: "text-1", patch: { x: 0.1 } },
    { elementId: "text-2", patch: { x: 0.2 } },
  ], now });
  assert.deepEqual(updated.elements.map((element) => element.x), [0.1, 0.2]);
  const deleted = deleteElements(updated.document, { viewId: "primary", elementIds: ["text-1", "text-2"], now });
  assert.equal(deleted.removed.length, 2);
  assert.deepEqual(deleted.document.views.primary.elements, []);
});

test("50 elementos mantienen zIndex contiguo tras reorder", () => {
  let document = makeDocument();
  for (let index = 0; index < 50; index += 1) {
    document = addText(document, { viewId: "primary", printAreaId: "primary-area", idFactory: () => `text-${index}`, now }).document;
  }
  const moved = moveElementLayer(document, { viewId: "primary", elementId: "text-0", direction: "forward", now });
  assert.equal(moved.document.views.primary.elements.length, 50);
  assert.deepEqual(moved.document.views.primary.elements.map((element) => element.zIndex), Array.from({ length: 50 }, (_, index) => index));
});
