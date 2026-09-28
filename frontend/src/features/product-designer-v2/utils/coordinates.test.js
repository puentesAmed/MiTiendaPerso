import test from "node:test";
import assert from "node:assert/strict";
import { normalizedRectToViewport, viewportRectToNormalized } from "./coordinates.js";

test("convierte coordenadas normalizadas al viewport del print area", () => {
  const result = normalizedRectToViewport(
    { x: 0.1, y: 0.25, width: 0.5, height: 0.4 },
    { x: 20, y: 40, width: 200, height: 100 },
  );
  assert.deepEqual(result, { x: 40, y: 65, width: 100, height: 40 });
});

test("round-trip viewport-normalized conserva el rectángulo", () => {
  const viewport = { x: 30, y: 15, width: 320, height: 180 };
  const normalized = { x: 0.2, y: 0.1, width: 0.35, height: 0.6 };
  const result = viewportRectToNormalized(normalizedRectToViewport(normalized, viewport), viewport);
  assert.deepEqual(result, normalized);
});

test("rechaza viewports sin dimensiones positivas", () => {
  assert.throws(
    () => normalizedRectToViewport({ x: 0, y: 0, width: 1, height: 1 }, { x: 0, y: 0, width: 0, height: 10 }),
    /dimensiones positivas/,
  );
});
