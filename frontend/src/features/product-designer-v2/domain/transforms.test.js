import test from "node:test";
import assert from "node:assert/strict";
import { domainElementToFabricRect, fabricTransformToDomain, keepElementReachable } from "./transforms.js";

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

test("resize uniforme 2x duplica bounds sin doble escala y preserva ratio", () => {
  const result = fabricTransformToDomain({ centerX: 300, centerY: 200, width: 100, height: 60, scaleX: 2, scaleY: 2, rotation: 0 }, viewport);
  assert.equal(result.width, 0.5);
  assert.equal(result.height, 0.4);
  assert.equal(result.width / result.height, (100 / viewport.width) / (60 / viewport.height));
  assert.deepEqual(result.scale, { x: 1, y: 1 });
});

test("recovery permite overflow parcial pero impide perder completamente la imagen", () => {
  const recovered = keepElementReachable({ x: 3, y: -2, width: 0.5, height: 0.25, rotation: 0, scale: { x: 1, y: 1 } });
  assert.ok(recovered.x < 1 && recovered.x + recovered.width > 0);
  assert.ok(recovered.y < 1 && recovered.y + recovered.height > 0);
  assert.ok(recovered.x + recovered.width > 1, "debe seguir permitiendo composición parcial en el borde");
  const rotated = keepElementReachable({ x: -3, y: 0.4, width: 2, height: 0.05, rotation: 90, scale: { x: 1, y: 1 } });
  const rotatedCenterX = rotated.x + rotated.width / 2;
  assert.ok(rotatedCenterX + rotated.height / 2 > 0, "la extensión rotada debe seguir accesible");
});
