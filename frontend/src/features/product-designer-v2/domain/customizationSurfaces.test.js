import assert from "node:assert/strict";
import test from "node:test";
import { canPersonalizeProduct, filterTemplateBySelectedSurfaceIds, getCommercialSurfaces, getProductCustomizationState, normalizeSelectedSurfaceIds } from "./customizationSurfaces.js";
import { getProductTemplateById } from "../templates/templateRepository.js";

const surfaces = [
  { surfaceId: "tshirt-front", enabled: true, required: true, priceModifier: 0 },
  { surfaceId: "tshirt-back", enabled: true, required: false, priceModifier: 5 },
];

test("selección comercial conserva orden, cero y superficies obligatorias", () => {
  assert.deepEqual(getCommercialSurfaces({ customizationPricing: { enabled: true, surfaces } }), surfaces);
  assert.deepEqual(normalizeSelectedSurfaceIds(surfaces, ["tshirt-back", "tshirt-front"]), ["tshirt-front", "tshirt-back"]);
  assert.throws(() => normalizeSelectedSurfaceIds(surfaces, ["tshirt-back"]), /obligatoria/);
  assert.throws(() => normalizeSelectedSurfaceIds(surfaces, ["missing"]), /no está disponible/);
});

test("template del diseñador contiene únicamente superficies seleccionadas", () => {
  const template = getProductTemplateById("tshirt-basic-v1");
  const filtered = filterTemplateBySelectedSurfaceIds(template, ["tshirt-front", "tshirt-sleeve-left"]);
  assert.deepEqual(filtered.printSurfaces.map((surface) => surface.id), ["tshirt-front", "tshirt-sleeve-left"]);
  assert.deepEqual(filtered.views.map((view) => view.id), ["front", "sleeve-left"]);
  assert.throws(() => filterTemplateBySelectedSurfaceIds(template, ["missing"]), /ajena/);
});

test("taza con única superficie required y modifier cero queda configurada y sin carrito directo", () => {
  const product = {
    customizable: true,
    customizationPricing: { enabled: true, surfaces: [{ surfaceId: "wrap-main", label: "Diseño envolvente", enabled: true, required: true, priceModifier: 0 }] },
  };
  const customizationState = getProductCustomizationState(product);
  assert.deepEqual(customizationState, {
    surfaces: product.customizationPricing.surfaces,
    personalizationConfigured: true,
    selectedSurfaceIds: ["wrap-main"],
    singleRequiredSurface: true,
  });
  assert.equal(canPersonalizeProduct({ customizationState, canAddToCart: true, isAliExpress: false, customizationQuote: { unitPrice: 12.5 }, quoteLoading: false }), true);
  assert.equal(getProductCustomizationState({ ...product, customizationPricing: { enabled: true, surfaces: [{ ...product.customizationPricing.surfaces[0], priceModifier: null }] } }).personalizationConfigured, false);
});
