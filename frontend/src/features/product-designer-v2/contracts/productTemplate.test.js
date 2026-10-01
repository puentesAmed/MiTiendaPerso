import test from "node:test";
import assert from "node:assert/strict";
import { validateProductTemplate } from "./productTemplate.js";
import { GENERIC_FLAT_DEMO_TEMPLATE } from "../templates/genericFlatDemo.js";
import { MUG_CERAMIC_STANDARD_V1_TEMPLATE, MUG_WRAP_PRINT_SURFACE } from "../templates/mugCeramicStandardV1.js";
import { TSHIRT_BACK_PRINT_SURFACE, TSHIRT_BASIC_V1_TEMPLATE, TSHIRT_FRONT_PRINT_SURFACE, TSHIRT_LEFT_SLEEVE_PRINT_SURFACE, TSHIRT_RIGHT_SLEEVE_PRINT_SURFACE } from "../templates/tshirtBasicV1.js";

test("ProductTemplate fixture cumple el contrato v1", () => {
  assert.deepEqual(validateProductTemplate(GENERIC_FLAT_DEMO_TEMPLATE), { valid: true, errors: [] });
});

test("template piloto de taza cumple contrato sin inventar geometría física", () => {
  assert.deepEqual(validateProductTemplate(MUG_CERAMIC_STANDARD_V1_TEMPLATE), { valid: true, errors: [] });
  assert.equal(MUG_CERAMIC_STANDARD_V1_TEMPLATE.productType, "mug");
  assert.deepEqual(MUG_CERAMIC_STANDARD_V1_TEMPLATE.views.map((view) => view.id), ["wrap"]);
  assert.equal(MUG_CERAMIC_STANDARD_V1_TEMPLATE.views[0].printSurfaceId, MUG_WRAP_PRINT_SURFACE.id);
  assert.equal(MUG_WRAP_PRINT_SURFACE.physicalSize, null);
  assert.equal(MUG_WRAP_PRINT_SURFACE.safeArea, null);
  assert.equal(MUG_WRAP_PRINT_SURFACE.bleed, null);
  assert.deepEqual(MUG_CERAMIC_STANDARD_V1_TEMPLATE.mockups, ["mug-white-basic-v1"]);
  assert.deepEqual(MUG_CERAMIC_STANDARD_V1_TEMPLATE.threeD, { profileId: "mug-11oz-v1" });
});

test("template de camiseta registra cuatro paneles independientes", () => {
  assert.deepEqual(validateProductTemplate(TSHIRT_BASIC_V1_TEMPLATE), { valid: true, errors: [] });
  assert.deepEqual(TSHIRT_BASIC_V1_TEMPLATE.views.map(({ id, label, printSurfaceId }) => ({ id, label, printSurfaceId })), [
    { id: "front", label: "Frontal", printSurfaceId: "tshirt-front" },
    { id: "back", label: "Trasera", printSurfaceId: "tshirt-back" },
    { id: "sleeve-left", label: "Manga izquierda", printSurfaceId: "tshirt-sleeve-left" },
    { id: "sleeve-right", label: "Manga derecha", printSurfaceId: "tshirt-sleeve-right" },
  ]);
  [TSHIRT_FRONT_PRINT_SURFACE, TSHIRT_BACK_PRINT_SURFACE, TSHIRT_LEFT_SLEEVE_PRINT_SURFACE, TSHIRT_RIGHT_SLEEVE_PRINT_SURFACE].forEach((surface) => {
    assert.equal(surface.physicalSize, null);
    assert.equal(surface.safeArea, null);
    assert.equal(surface.bleed, null);
    assert.deepEqual(surface.restrictedZones, []);
  });
  assert.deepEqual(TSHIRT_BASIC_V1_TEMPLATE.views.map((view) => view.editorPresentation.type), ["garment", "garment", "garment", "garment"]);
});

test("ProductTemplate inválido devuelve errores explícitos", () => {
  const result = validateProductTemplate({ schemaVersion: 99, views: [] });
  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /schemaVersion/);
  assert.match(result.errors.join(" "), /templateId/);
  assert.match(result.errors.join(" "), /al menos una vista/);
});
