import test from "node:test";
import assert from "node:assert/strict";
import { MUG_WRAP_PRINT_SURFACE } from "../templates/mugCeramicStandardV1.js";
import { PRODUCT_3D_PROFILES } from "../three/threeModelRegistry.js";
import { createUvCalibrationDefinition, renderUvCalibrationCanvas } from "../three/uvCalibrationFixture.js";
import { normalizedRectToTextureRect, normalizedToTexturePoint, normalizedToUvPoint, textureRectToNormalizedRect, textureToNormalizedPoint, uvToNormalizedPoint } from "./printSurfaceCoordinates.js";

const uvMapping = PRODUCT_3D_PROFILES["mug-ceramic-development-v1"].printableSurfaces[0].uvMapping;

function close(actual, expected) {
  assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);
}

test("round-trip normalized → texture px → normalized conserva posición y tamaño relativo", () => {
  for (const point of [{ x: 0, y: 0 }, { x: 0.17, y: 0.73 }, { x: 0.5, y: 0.5 }, { x: 1, y: 1 }]) {
    const texture = normalizedToTexturePoint(point, MUG_WRAP_PRINT_SURFACE);
    const result = textureToNormalizedPoint(texture, MUG_WRAP_PRINT_SURFACE);
    close(result.x, point.x);
    close(result.y, point.y);
  }
  assert.deepEqual(normalizedToTexturePoint({ x: 0.5, y: 0.5 }, MUG_WRAP_PRINT_SURFACE), { x: 504, y: 240 });
  const element = { x: 0.2, y: 0.3, width: 0.4, height: 0.15 };
  const textureRect = normalizedRectToTextureRect(element, MUG_WRAP_PRINT_SURFACE);
  assert.deepEqual(textureRect, { x: 201.60000000000002, y: 144, width: 403.20000000000005, height: 72 });
  assert.deepEqual(textureRectToNormalizedRect(textureRect, MUG_WRAP_PRINT_SURFACE), element);
});

test("calibración demuestra left/center/right y TOP/BOTTOM contra UV", () => {
  const definition = createUvCalibrationDefinition();
  assert.equal(definition.verticalLines.filter((line) => line.emphasis).length, 3);
  assert.deepEqual(definition.labels.map((label) => label.text), ["LEFT", "FRONT", "RIGHT", "TOP", "BOTTOM"]);
  assert.deepEqual(normalizedToUvPoint({ x: 0, y: 0.5 }, uvMapping), { u: 0, v: 0.5 });
  assert.deepEqual(normalizedToUvPoint({ x: 0.5, y: 0.5 }, uvMapping), { u: uvMapping.frontU, v: 0.5 });
  assert.deepEqual(normalizedToUvPoint({ x: 1, y: 0.5 }, uvMapping), { u: 1, v: 0.5 });
  assert.deepEqual(normalizedToUvPoint({ x: 0.5, y: 0 }, uvMapping), { u: 0.5, v: 1 });
  assert.deepEqual(normalizedToUvPoint({ x: 0.5, y: 1 }, uvMapping), { u: 0.5, v: 0 });
});

test("round-trip normalized ↔ UV soporta flips y rotación declarativos", () => {
  for (const mapping of [uvMapping, { ...uvMapping, flipU: true, flipV: false, rotation: Math.PI / 2 }]) {
    const point = { x: 0.2, y: 0.7 };
    const result = uvToNormalizedPoint(normalizedToUvPoint(point, mapping), mapping);
    close(result.x, point.x);
    close(result.y, point.y);
  }
});

test("fixture de calibración genera un canvas con la resolución del PrintSurface", () => {
  const labels = [];
  const context = { fillRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, fillText: (text) => labels.push(text) };
  const canvas = { getContext: () => context };
  const result = renderUvCalibrationCanvas(MUG_WRAP_PRINT_SURFACE, { createElement: () => canvas });
  assert.equal(result.width, 1008);
  assert.equal(result.height, 480);
  assert.deepEqual(labels, ["LEFT", "FRONT", "RIGHT", "TOP", "BOTTOM"]);
});
