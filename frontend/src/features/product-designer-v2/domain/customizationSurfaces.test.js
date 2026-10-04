import assert from "node:assert/strict";
import test from "node:test";
import { filterTemplateBySelectedSurfaceIds, getCommercialSurfaces, normalizeSelectedSurfaceIds } from "./customizationSurfaces.js";
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
