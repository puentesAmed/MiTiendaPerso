import test from "node:test";
import assert from "node:assert/strict";
import { domainElementToFabricRect, fabricTransformToDomain } from "./transforms.js";

const viewport = { x: 100, y: 50, width: 400, height: 300 };

test("domain -> Fabric -> domain conserva geometría normalizada", () => {
  const element = { x: 0.2, y: 0.3, width: 0.4, height: 0.25, rotation: 18 };
  const fabric = domainElementToFabricRect(element, viewport);
  const result = fabricTransformToDomain({ ...fabric, scaleX: 1, scaleY: 1 }, viewport);
  assert.deepEqual(result, { ...element, scale: { x: 1, y: 1 } });
});

test("normaliza scale Fabric dentro de width/height de dominio", () => {
  const result = fabricTransformToDomain({ centerX: 300, centerY: 200, width: 100, height: 60, scaleX: 2, scaleY: 1.5, rotation: 30 }, viewport);
  assert.equal(result.width, 0.5);
  assert.equal(result.height, 0.3);
  assert.deepEqual(result.scale, { x: 1, y: 1 });
  assert.equal(result.rotation, 30);
});
