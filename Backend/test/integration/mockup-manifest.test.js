import test from "node:test";
import assert from "node:assert/strict";

import { getMockupManifest, mockupRegistry, resolveMockupTemplatePath, validateMockupManifest } from "../../src/mockups/mockup-manifest.js";

test("registry resuelve solo el mockup técnico y la vista registrados", () => {
  const manifest = getMockupManifest({ templateId: "mug-ceramic-standard-v1", mockupId: "mug-white-basic-v1", sourceViewId: "wrap" });
  assert.equal(manifest.kind, "development");
  assert.equal(validateMockupManifest(manifest).valid, true);
  assert.match(resolveMockupTemplatePath(manifest), /mockups[\\/]assets[\\/]mug-white-basic-v1\.png$/);
  assert.equal(getMockupManifest({ templateId: "mug-ceramic-standard-v1", mockupId: "../secret", sourceViewId: "wrap" }), null);
  assert.equal(getMockupManifest({ templateId: "mug-ceramic-standard-v1", mockupId: "mug-white-basic-v1", sourceViewId: "front" }), null);
  assert.deepEqual(Object.keys(mockupRegistry), ["mug-white-basic-v1"]);
});

test("validator rechaza bbox, enums y output inventados", () => {
  const invalid = { ...mockupRegistry["mug-white-basic-v1"], placement: { ...mockupRegistry["mug-white-basic-v1"].placement, bbox: [0, 0, 0, 2], scaleMode: "perspective" }, output: { format: "svg", sizeMode: "arbitrary" } };
  const validation = validateMockupManifest(invalid);
  assert.equal(validation.valid, false);
  assert.match(validation.errors.join(" "), /bbox|scaleMode|output/);
});

