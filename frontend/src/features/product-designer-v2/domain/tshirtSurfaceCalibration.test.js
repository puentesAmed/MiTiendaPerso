import test from "node:test";
import assert from "node:assert/strict";
import { TSHIRT_SURFACE_CALIBRATION, editableMaskContains, editorialPointToGarmentRegions, editorialToUvPoint, uvRectToAtlasPixels, uvToEditorialPoint } from "./tshirtSurfaceCalibration.js";
import { TSHIRT_FRONT_PRINT_SURFACE, TSHIRT_LEFT_SLEEVE_PRINT_SURFACE } from "../templates/tshirtBasicV1.js";
import { createGarmentCalibrationDefinition, renderGarmentCalibrationCanvas } from "../three/uvCalibrationFixture.js";

const PANELS = ["front", "back", "sleeve-left", "sleeve-right"];

for (const panelId of PANELS) {
  test(`${panelId} usa un panel UV real independiente`, () => {
    const { mask, regions } = TSHIRT_SURFACE_CALIBRATION[panelId];
    assert.equal(regions.length, 1);
    assert.equal(regions[0].id, panelId);
    assert.equal(editableMaskContains(mask, { x: 0.5, y: 0.5 }), true);
    assert.equal(editorialPointToGarmentRegions(TSHIRT_SURFACE_CALIBRATION[panelId], { x: 0.5, y: 0.5 })[0].regionId, panelId);
  });

  test(`${panelId} round-trip editorial → UV → editorial conserva coordenadas`, () => {
    const region = TSHIRT_SURFACE_CALIBRATION[panelId].regions[0];
    const point = { x: 0.5, y: 0.5 };
    const roundTrip = uvToEditorialPoint(editorialToUvPoint(point, region), region);
    assert.ok(Math.abs(point.x - roundTrip.x) < 1e-10);
    assert.ok(Math.abs(point.y - roundTrip.y) < 1e-10);
    const atlas = uvRectToAtlasPixels(region.uvMapping, TSHIRT_SURFACE_CALIBRATION.atlasSize);
    assert.ok(atlas.width > 0 && atlas.height > 0);
  });
}

test("mangas anatómicas son islas UV completas, independientes y no mitades FRONT/BACK", () => {
  const left = TSHIRT_SURFACE_CALIBRATION["sleeve-left"].regions[0].uvMapping;
  const right = TSHIRT_SURFACE_CALIBRATION["sleeve-right"].regions[0].uvMapping;
  assert.ok(left.uMin > right.uMax);
  assert.ok(left.uMax - left.uMin > 0.3);
  assert.ok(right.uMax - right.uMin > 0.3);
  assert.notEqual(left.flipU, right.flipU);
});

test("guías FRONT/BACK derivan contornos de cuello distintos de la calibración real", () => {
  const front = TSHIRT_SURFACE_CALIBRATION.front.guide;
  const back = TSHIRT_SURFACE_CALIBRATION.back.guide;
  assert.match(front.source, /tshirt-web\.glb/);
  assert.match(back.source, /tshirt-web\.glb/);
  assert.ok(front.outline[0].length >= 8);
  assert.ok(back.outline[0].length >= 8);
  assert.notDeepEqual(front.neckContour, back.neckContour);
  const depth = (points) => Math.max(...points.map(([, y]) => y)) - Math.min(...points.map(([, y]) => y));
  assert.ok(depth(front.neckContour) > depth(back.neckContour), "el cuello frontal real es más profundo que el posterior");
});

test("fixtures técnicos son específicos de torso y manga", () => {
  assert.deepEqual(createGarmentCalibrationDefinition("front").labels.map(({ text }) => text), ["CENTER", "TOP-CENTER", "BOTTOM-CENTER", "LEFT-CHEST", "RIGHT-CHEST", "LEFT-SIDE", "RIGHT-SIDE"]);
  assert.deepEqual(createGarmentCalibrationDefinition("tshirt-sleeve-left").labels.map(({ text }) => text), ["SHOULDER", "CENTER", "HEM"]);
  const operations = [];
  const canvas = { getContext: () => ({ clearRect: (...args) => operations.push(["clearRect", ...args]), fillText: (...args) => operations.push(["fillText", ...args]), set textAlign(value) {}, set textBaseline(value) {}, set font(value) {}, set fillStyle(value) {} }) };
  renderGarmentCalibrationCanvas(TSHIRT_FRONT_PRINT_SURFACE, { createElement: () => canvas });
  renderGarmentCalibrationCanvas(TSHIRT_LEFT_SLEEVE_PRINT_SURFACE, { createElement: () => canvas });
  assert.equal(operations.filter(([operation]) => operation === "fillText").length, 10);
});
