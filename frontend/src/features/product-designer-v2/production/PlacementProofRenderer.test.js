import test from "node:test";
import assert from "node:assert/strict";

import { TSHIRT_BASIC_V1_TEMPLATE } from "../templates/tshirtBasicV1.js";
import { MUG_CERAMIC_STANDARD_V1_TEMPLATE } from "../templates/mugCeramicStandardV1.js";
import { TSHIRT_SURFACE_CALIBRATION } from "../domain/tshirtSurfaceCalibration.js";
import { PRODUCT_3D_PROFILES } from "../three/threeModelRegistry.js";
import { domainElementToFabricRect } from "../domain/transforms.js";
import { getPlacementAlignment, normalizedElementToSurfacePixels } from "./alignmentContract.js";
import {
  PLACEMENT_ALIGNMENT_MARKERS,
  projectPlacementAlignmentMarkers,
} from "./placementAlignmentFixture.js";
import { composePlacementProof, getPlacementProofGeometry } from "./PlacementProofRenderer.js";

function fakeCanvas() {
  const operations = [];
  const context = new Proxy({
    beginPath: () => operations.push(["beginPath"]),
    moveTo: (...args) => operations.push(["moveTo", ...args]),
    lineTo: (...args) => operations.push(["lineTo", ...args]),
    closePath: () => operations.push(["closePath"]),
    fill: (...args) => operations.push(["fill", ...args]),
    stroke: (...args) => operations.push(["stroke", ...args]),
    fillRect: (...args) => operations.push(["fillRect", ...args]),
    strokeRect: (...args) => operations.push(["strokeRect", ...args]),
    fillText: (...args) => operations.push(["fillText", ...args]),
    drawImage: (...args) => operations.push(["drawImage", ...args]),
    save: () => operations.push(["save"]),
    restore: () => operations.push(["restore"]),
    translate: (...args) => operations.push(["translate", ...args]),
    scale: (...args) => operations.push(["scale", ...args]),
    setLineDash: (...args) => operations.push(["setLineDash", ...args]),
  }, { set(target, key, value) { target[key] = value; return true; } });
  return { canvas: { width: 0, height: 0, getContext: () => context }, context, operations };
}

test("normalizado→píxeles es el mismo contrato usado por Fabric/artwork", () => {
  const element = { x: 0.32, y: 0.18, width: 0.4, height: 0.28, rotation: 23 };
  const size = { width: 754, height: 1024 };
  const placement = normalizedElementToSurfacePixels(element, size);
  const artwork = domainElementToFabricRect(element, { x: 0, y: 0, ...size });
  assert.deepEqual(artwork, { centerX: placement.centerX, centerY: placement.centerY, width: placement.width, height: placement.height, rotation: 23 });
});

test("el fixture TOP/LEFT/CENTER/RIGHT/BOTTOM conserva orientación sin intercambiar lados", () => {
  const projected = projectPlacementAlignmentMarkers({ width: 1000, height: 500 });
  assert.deepEqual(PLACEMENT_ALIGNMENT_MARKERS.map(({ id }) => id), ["TOP", "LEFT", "CENTER", "RIGHT", "BOTTOM"]);
  assert.deepEqual(projected.map(({ id, x, y }) => ({ id, x, y })), [
    { id: "TOP", x: 500, y: 40 },
    { id: "LEFT", x: 80, y: 250 },
    { id: "CENTER", x: 500, y: 250 },
    { id: "RIGHT", x: 920, y: 250 },
    { id: "BOTTOM", x: 500, y: 460 },
  ]);
});

test("proof de taza conserva aspect ratio y dibuja artwork sin offset adicional", () => {
  const view = MUG_CERAMIC_STANDARD_V1_TEMPLATE.views[0];
  const surface = MUG_CERAMIC_STANDARD_V1_TEMPLATE.printSurfaces[0];
  const geometry = getPlacementProofGeometry(surface);
  const { canvas, operations } = fakeCanvas();
  const artwork = { width: 1008, height: 480 };
  composePlacementProof({ canvas, artworkCanvas: artwork, template: MUG_CERAMIC_STANDARD_V1_TEMPLATE, view, pathFactory: null });
  const draw = operations.find(([name]) => name === "drawImage");
  assert.deepEqual(draw.slice(1), [artwork, geometry.surfaceRect.x, geometry.surfaceRect.y, geometry.surfaceRect.width, geometry.surfaceRect.height]);
  assert.equal(geometry.surfaceRect.width / geometry.surfaceRect.height, surface.aspectRatio);
});

test("BACK proof permanece editorial y el mirror vive solo en calibration 3D", () => {
  const view = TSHIRT_BASIC_V1_TEMPLATE.views.find((candidate) => candidate.id === "back");
  const { canvas, operations } = fakeCanvas();
  composePlacementProof({ canvas, artworkCanvas: { width: 747, height: 1024 }, template: TSHIRT_BASIC_V1_TEMPLATE, view, pathFactory: null });
  assert.equal(operations.some(([name, x]) => name === "scale" && x < 0), false);
  const profile = PRODUCT_3D_PROFILES["tshirt-basic-v1"].printableSurfaces.find((surface) => surface.printSurfaceId === "tshirt-back");
  assert.equal(profile.uvMapping.flipU, TSHIRT_SURFACE_CALIBRATION.back.regions[0].uvMapping.flipU);
  assert.equal(profile.uvMapping.flipU, true);
});

test("mangas conservan identidad anatómica independiente", () => {
  const left = TSHIRT_BASIC_V1_TEMPLATE.views.find((view) => view.id === "sleeve-left");
  const right = TSHIRT_BASIC_V1_TEMPLATE.views.find((view) => view.id === "sleeve-right");
  assert.equal(getPlacementAlignment(TSHIRT_BASIC_V1_TEMPLATE, left).surfaceId, "tshirt-sleeve-left");
  assert.equal(getPlacementAlignment(TSHIRT_BASIC_V1_TEMPLATE, right).surfaceId, "tshirt-sleeve-right");
  assert.notDeepEqual(left.editorPresentation.guide.outline, right.editorPresentation.guide.outline);
});
