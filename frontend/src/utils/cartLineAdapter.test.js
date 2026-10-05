import assert from "node:assert/strict";
import test from "node:test";
import { addOrMergeCartLine, buildCartLineKey, buildShippingQuotePayload, createCartLine, removeCartLine, toCheckoutItem, updateCartLineQuantity } from "./cartLineAdapter.js";

const product = { _id: "shirt-1", name: "Camiseta", price: 20, customizable: true };

function customization(selectedSurfaceIds, unitPrice) {
  return {
    type: "designer",
    schemaVersion: 2,
    clientId: "design-1",
    selectedSurfaceIds,
    designDocument: { selectedSurfaceIds },
    customizationPricing: { unitPrice, selectedSurfaceIds },
  };
}

test("la identidad de línea distingue selecciones de superficie", () => {
  const front = buildCartLineKey({ productId: "shirt-1", customization: customization(["tshirt-front"], 20) });
  const back = buildCartLineKey({ productId: "shirt-1", customization: customization(["tshirt-back"], 25) });
  assert.notEqual(front, back);
});

test("carrito muestra snapshot cotizado y checkout propaga selección", () => {
  const line = createCartLine({ product, customization: customization(["tshirt-front", "tshirt-back"], 25), createClientId: () => "unused" });
  assert.equal(line.presentation.displayPrice, 25);
  assert.deepEqual(toCheckoutItem(line).customization.selectedSurfaceIds, ["tshirt-front", "tshirt-back"]);
});

test("shipping quote conserva el contrato Designer V2 completo", () => {
  const designer = {
    ...customization(["wrap-main"], 12.5),
    productId: "mug-1",
    designDocument: {
      schemaVersion: 1,
      documentId: "document-1",
      productId: "mug-1",
      selectedSurfaceIds: ["wrap-main"],
    },
    uploads: { assets: {}, surfaces: { wrap: { artworkUploadId: "artwork-1", proofUploadId: "proof-1" } } },
  };
  const payload = buildShippingQuotePayload([
    { productId: "mug-1", quantity: 1, variant: null, customization: designer },
  ], null, { shippingMethodId: "pickup-free" });

  assert.equal(payload.items[0].customization, designer);
  assert.deepEqual(payload.items[0].customization.selectedSurfaceIds, ["wrap-main"]);
  assert.equal(payload.shippingMethodId, "pickup-free");
});

test("carrito no crea línea plain para producto personalizable", () => {
  assert.throws(() => createCartLine({ product, customization: null }), /requiere una personalización válida/);
});

test("tres unidades pueden compartir diseño o permanecer en tres líneas", () => {
  const designA = { ...customization(["tshirt-front"], 20), clientId: "design-a", designDocument: { documentId: "document-a", selectedSurfaceIds: ["tshirt-front"] } };
  const designB = { ...designA, clientId: "design-b", designDocument: { ...designA.designDocument, documentId: "document-b" } };
  const designC = { ...designA, clientId: "design-c", designDocument: { ...designA.designDocument, documentId: "document-c" } };
  const oneDesign = createCartLine({ product, quantity: 3, customization: designA });
  assert.equal(oneDesign.quantity, 3);
  let lines = [createCartLine({ product, customization: designA }), createCartLine({ product, customization: designB }), createCartLine({ product, customization: designC })];
  assert.equal(new Set(lines.map((line) => line.lineKey)).size, 3);
  assert.equal(lines.reduce((total, line) => total + line.quantity, 0), 3);
  lines = addOrMergeCartLine(lines, createCartLine({ product, customization: designA }));
  assert.deepEqual(lines.map((line) => line.quantity), [2, 1, 1]);
  lines = updateCartLineQuantity(lines, lines[1].lineKey, 2);
  assert.deepEqual(lines.map((line) => line.quantity), [2, 2, 1]);
  lines = removeCartLine(lines, lines[0].lineKey);
  assert.deepEqual(lines.map((line) => line.customization.clientId), ["design-b", "design-c"]);
  assert.equal(toCheckoutItem(oneDesign).quantity, 3);
});
