import test from "node:test";
import assert from "node:assert/strict";
import { getPresentationSurfaceStyle, validateEditorPresentation } from "./editorPresentation.js";
import { TSHIRT_BASIC_V1_TEMPLATE, TSHIRT_FRONT_PRINT_SURFACE, TSHIRT_BACK_PRINT_SURFACE } from "../templates/tshirtBasicV1.js";

test("FRONT/BACK declaran guías diferentes que contienen su PrintSurface", () => {
  const [front, back] = TSHIRT_BASIC_V1_TEMPLATE.views.map((view) => view.editorPresentation);
  assert.notEqual(front.guideId, back.guideId);
  [front, back].forEach((presentation) => assert.deepEqual(validateEditorPresentation(presentation), { valid: true, errors: [] }));
});

test("las cuatro vistas conservan guía derivada separada de editableMask", () => {
  assert.equal(TSHIRT_BASIC_V1_TEMPLATE.views.length, 4);
  TSHIRT_BASIC_V1_TEMPLATE.views.forEach(({ editorPresentation }) => {
    assert.match(editorPresentation.guide.source, /tshirt-web\.glb/);
    assert.notEqual(editorPresentation.guide.outline, editorPresentation.editableMask.outline);
  });
  assert.notDeepEqual(TSHIRT_BASIC_V1_TEMPLATE.views[0].editorPresentation.guide.neckContour, TSHIRT_BASIC_V1_TEMPLATE.views[1].editorPresentation.guide.neckContour);
});

test("placement normalizado se traduce a viewport sin alterar resolución lógica", () => {
  const [front] = TSHIRT_BASIC_V1_TEMPLATE.views.map((view) => view.editorPresentation);
  assert.deepEqual(getPresentationSurfaceStyle(front), {
    left: "0%",
    top: "0%",
    width: "100%",
    height: "100%",
  });
  assert.deepEqual(TSHIRT_FRONT_PRINT_SURFACE.previewTextureResolution, { width: 754, height: 1024 });
  assert.deepEqual(TSHIRT_BACK_PRINT_SURFACE.previewTextureResolution, { width: 747, height: 1024 });
});

test("rechaza una PrintSurface editorial fuera de la guía", () => {
  const result = validateEditorPresentation({
    type: "garment",
    guideId: "basic-tshirt-front",
    aspectRatio: 0.82,
    guideBounds: { x: 0.1, y: 0.1, width: 0.8, height: 0.8 },
    printSurface: { x: 0, y: 0.2, width: 0.4, height: 0.4 },
  });
  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /contener/);
});
