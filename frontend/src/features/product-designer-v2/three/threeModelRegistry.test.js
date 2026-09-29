import test from "node:test";
import assert from "node:assert/strict";
import { MUG_CERAMIC_STANDARD_V1_TEMPLATE } from "../templates/mugCeramicStandardV1.js";
import { GENERIC_FLAT_DEMO_TEMPLATE } from "../templates/genericFlatDemo.js";
import { THREE_MODEL_MANIFESTS, getThreeDManifest, getThreeDManifestForTemplate, getThreeSourceViewIds, isThreeDModeAvailable, validateThreeDManifest, validateThreeDManifestForTemplate } from "./threeModelRegistry.js";

test("registry resuelve un manifest válido sin aceptar model URLs arbitrarias", () => {
  const manifest = getThreeDManifest("mug-development-v1");
  assert.equal(validateThreeDManifest(manifest).valid, true);
  assert.equal(manifest.asset.kind, "development");
  assert.match(manifest.asset.url, /^\/models\/[a-z0-9-]+\.glb$/);
  assert.equal(getThreeDManifest("https://example.com/evil.glb"), null);
  assert.deepEqual(Object.keys(THREE_MODEL_MANIFESTS), ["mug-development-v1"]);
});

test("eligibilidad depende de ProductTemplate.threeD y sourceView registrado", () => {
  assert.equal(isThreeDModeAvailable(MUG_CERAMIC_STANDARD_V1_TEMPLATE), true);
  assert.equal(getThreeDManifestForTemplate(MUG_CERAMIC_STANDARD_V1_TEMPLATE).bindings[0].sourceViewId, "wrap");
  assert.equal(isThreeDModeAvailable(GENERIC_FLAT_DEMO_TEMPLATE), false);
  const incompatibleTemplate = { ...MUG_CERAMIC_STANDARD_V1_TEMPLATE, views: [{ ...MUG_CERAMIC_STANDARD_V1_TEMPLATE.views[0], id: "front" }] };
  assert.equal(validateThreeDManifestForTemplate(THREE_MODEL_MANIFESTS["mug-development-v1"], incompatibleTemplate).valid, false);
});

test("validator rechaza texture, camera y orbit fuera de contrato", () => {
  const source = THREE_MODEL_MANIFESTS["mug-development-v1"];
  const invalid = { ...source, bindings: [{ ...source.bindings[0], texture: { ...source.bindings[0].texture, wrapS: "unsafe" } }], camera: { ...source.camera, fov: 180 }, orbit: { ...source.orbit, maxDistanceFactor: 0 } };
  const result = validateThreeDManifest(invalid);
  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /texture|camera|orbit/);
});

test("múltiples bindings producen una textura por sourceView sin asumir producto", () => {
  assert.deepEqual(getThreeSourceViewIds({ bindings: [{ sourceViewId: "front" }, { sourceViewId: "back" }, { sourceViewId: "front" }] }), ["front", "back"]);
});

