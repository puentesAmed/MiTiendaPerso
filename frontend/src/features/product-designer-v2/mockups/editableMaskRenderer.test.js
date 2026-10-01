import test from "node:test";
import assert from "node:assert/strict";
import { applyEditableMask } from "./editableMaskRenderer.js";
import { TSHIRT_SURFACE_CALIBRATION } from "../domain/tshirtSurfaceCalibration.js";

test("editableMask conserva alpha únicamente dentro del panel UV", () => {
  const operations = [];
  const context = {
    save: () => operations.push("save"), restore: () => operations.push("restore"), beginPath: () => operations.push("beginPath"),
    moveTo() {}, lineTo() {}, closePath() {}, fill: () => operations.push("fill"),
    set globalCompositeOperation(value) { operations.push(value); },
  };
  const canvas = { width: 754, height: 1024, getContext: () => context };
  assert.equal(applyEditableMask(canvas, TSHIRT_SURFACE_CALIBRATION.front.mask), canvas);
  assert.deepEqual(operations.filter((value) => value === "destination-in" || value === "destination-out"), ["destination-in"]);
  assert.equal(operations.filter((value) => value === "fill").length, 1);
});
