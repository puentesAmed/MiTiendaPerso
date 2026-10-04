import assert from "node:assert/strict";
import test from "node:test";
import { buildCartLineKey, createCartLine, toCheckoutItem } from "./cartLineAdapter.js";

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
