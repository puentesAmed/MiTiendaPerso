import test from "node:test";
import assert from "node:assert/strict";
import { editorialGuideContainsMask, getPresentationSurfaceStyle, validateEditorPresentation } from "./editorPresentation.js";
import { TSHIRT_SURFACE_CALIBRATION } from "./tshirtSurfaceCalibration.js";
import { TSHIRT_BASIC_V1_TEMPLATE, TSHIRT_FRONT_PRINT_SURFACE, TSHIRT_BACK_PRINT_SURFACE, TSHIRT_LEFT_SLEEVE_PRINT_SURFACE, TSHIRT_RIGHT_SLEEVE_PRINT_SURFACE } from "../templates/tshirtBasicV1.js";

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

test("FRONT/BACK usan torso editorial recto, cuellos propios y contienen la máscara técnica", () => {
  const [front, back] = TSHIRT_BASIC_V1_TEMPLATE.views.map((view) => view.editorPresentation);
  [front, back].forEach((presentation) => {
    const hem = presentation.guide.outline[0].filter(([, y]) => y >= 0.99);
    const hemWidth = Math.max(...hem.map(([x]) => x)) - Math.min(...hem.map(([x]) => x));
    assert.ok(hemWidth >= 0.95, "el bajo editorial no converge en forma de embudo");
    assert.ok(editorialGuideContainsMask(presentation.guide, presentation.editableMask));
    assert.ok(presentation.guide.neckContour.length >= 6, "el cuello conserva una curva, no una recta");
    assert.equal(presentation.guide.neckContour[0][1], 0, "el cuello debe abrirse por el borde superior");
    assert.equal(presentation.guide.neckContour.at(-1)[1], 0, "el cuello no debe ser un hueco flotante");
    assert.equal(presentation.guide.cutoutPaths.length, 2, "la guía debe presentar dos sisas curvas");
  });
  assert.notDeepEqual(front.guide.neckContour, back.guide.neckContour);
  assert.ok(Math.max(...front.guide.neckContour.map(([, y]) => y)) > Math.max(...back.guide.neckContour.map(([, y]) => y)), "FRONT conserva un escote más profundo que BACK");
});

test("displayFit es declarativo por vista y reduce solo las mangas", () => {
  const [front, back, leftSleeve, rightSleeve] = TSHIRT_BASIC_V1_TEMPLATE.views.map((view) => view.editorPresentation);
  assert.deepEqual(front.displayFit, { maxWidthRatio: 1, maxHeightRatio: 1 });
  assert.deepEqual(back.displayFit, { maxWidthRatio: 1, maxHeightRatio: 1 });
  [leftSleeve, rightSleeve].forEach((presentation) => {
    assert.ok(presentation.displayFit.maxWidthRatio >= 0.6 && presentation.displayFit.maxWidthRatio <= 0.75);
    assert.ok(presentation.displayFit.maxHeightRatio < 1);
  });
  assert.deepEqual(TSHIRT_LEFT_SLEEVE_PRINT_SURFACE.previewTextureResolution, { width: 1024, height: 525 });
  assert.deepEqual(TSHIRT_RIGHT_SLEEVE_PRINT_SURFACE.previewTextureResolution, { width: 1024, height: 525 });
  assert.equal(TSHIRT_LEFT_SLEEVE_PRINT_SURFACE.coordinateSystem, "normalized-0-1");
  assert.equal(TSHIRT_RIGHT_SLEEVE_PRINT_SURFACE.coordinateSystem, "normalized-0-1");
});

test("placement normalizado se traduce a viewport sin alterar resolución lógica", () => {
  const [front] = TSHIRT_BASIC_V1_TEMPLATE.views.map((view) => view.editorPresentation);
  assert.deepEqual(getPresentationSurfaceStyle(front), {
    left: "12.7267%",
    top: "8.9525%",
    width: "75.902%",
    height: "82.6587%",
  });
  assert.deepEqual(TSHIRT_FRONT_PRINT_SURFACE.previewTextureResolution, { width: 754, height: 1024 });
  assert.deepEqual(TSHIRT_BACK_PRINT_SURFACE.previewTextureResolution, { width: 747, height: 1024 });
});

test("el frame editorial FRONT coincide con la proyección del panel sin cambiar mapping", () => {
  const [front] = TSHIRT_BASIC_V1_TEMPLATE.views.map((view) => view.editorPresentation);
  assert.deepEqual(front.printSurface, { x: 0.127267, y: 0.089525, width: 0.75902, height: 0.826587 });
  assert.deepEqual(front.regions[0].editorRect, { x: 0, y: 0, width: 1, height: 1 });
  assert.deepEqual(front.regions[0].uvMapping, TSHIRT_SURFACE_CALIBRATION.front.regions[0].uvMapping);
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
