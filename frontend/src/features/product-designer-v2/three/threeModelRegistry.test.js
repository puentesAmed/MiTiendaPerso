import test from "node:test";
import assert from "node:assert/strict";
import { MUG_CERAMIC_STANDARD_V1_TEMPLATE } from "../templates/mugCeramicStandardV1.js";
import { GENERIC_FLAT_DEMO_TEMPLATE } from "../templates/genericFlatDemo.js";
import { PRODUCT_3D_PROFILES, THREE_MODEL_ASSETS, getProduct3DProfile, getProduct3DProfileForTemplate, getProduct3DSurfaceIds, getThreeModelAsset, isThreeDModeAvailable, validateProduct3DProfile, validateProduct3DProfileForTemplate } from "./threeModelRegistry.js";

const mugProfile = PRODUCT_3D_PROFILES["mug-11oz-v1"];
const fallbackProfile = PRODUCT_3D_PROFILES["mug-ceramic-development-v1"];

test("registry separa Product3DProfile del asset y no acepta ids arbitrarios", () => {
  assert.equal(validateProduct3DProfile(mugProfile).valid, true);
  assert.equal(getProduct3DProfile("mug-11oz-v1"), mugProfile);
  assert.equal(getProduct3DProfile("https://example.com/evil.glb"), null);
  assert.equal(getThreeModelAsset(mugProfile.modelId), THREE_MODEL_ASSETS["mug-11oz-v1"]);
  assert.equal(mugProfile.modelStatus, "development");
  assert.equal(mugProfile.dimensions, null);
  assert.deepEqual(mugProfile.referenceData.images, []);
  assert.equal(validateProduct3DProfile(fallbackProfile).valid, true);
  assert.equal(getThreeModelAsset(fallbackProfile.modelId), THREE_MODEL_ASSETS["mug-development-v1"]);
});

test("eligibilidad depende de profileId y PrintSurface registrados", () => {
  assert.equal(isThreeDModeAvailable(MUG_CERAMIC_STANDARD_V1_TEMPLATE), true);
  assert.equal(getProduct3DProfileForTemplate(MUG_CERAMIC_STANDARD_V1_TEMPLATE), mugProfile);
  assert.equal(isThreeDModeAvailable(GENERIC_FLAT_DEMO_TEMPLATE), false);
  const incompatibleTemplate = { ...MUG_CERAMIC_STANDARD_V1_TEMPLATE, printSurfaces: [] };
  assert.equal(validateProduct3DProfileForTemplate(mugProfile, incompatibleTemplate).valid, false);
});

test("perfil declara UV, seam/front y material blanco de forma explícita", () => {
  const surface = mugProfile.printableSurfaces[0];
  assert.deepEqual(surface.uvMapping, { uMin: 0, uMax: 1, vMin: 0, vMax: 1, seamU: 0, frontU: 0.5, flipU: false, flipV: true, rotation: 0 });
  assert.equal(mugProfile.materialVariants.defaultVariantId, "ceramic-white");
  assert.equal(mugProfile.materialVariants.variants[0].materials.every((material) => material.color === "#ffffff"), true);
  assert.deepEqual(getProduct3DSurfaceIds(mugProfile), ["wrap-main"]);
});

test("validator rechaza UV, camera y orbit fuera de contrato", () => {
  const invalid = { ...mugProfile, printableSurfaces: [{ ...mugProfile.printableSurfaces[0], uvMapping: { ...mugProfile.printableSurfaces[0].uvMapping, uMax: 0 } }], camera: { ...mugProfile.camera, fov: 180 }, orbit: { ...mugProfile.orbit, maxDistanceFactor: 0 } };
  const result = validateProduct3DProfile(invalid);
  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /uvMapping|camera|orbit/);
});

test("offset/repeat requieren justificación y frente/seam deben respetar PrintSurface", () => {
  const unjustified = { ...mugProfile, printableSurfaces: [{ ...mugProfile.printableSurfaces[0], uvMapping: { ...mugProfile.printableSurfaces[0].uvMapping, offset: [0.1, 0] } }] };
  assert.equal(validateProduct3DProfile(unjustified).valid, false);
  const misplacedFront = { ...mugProfile, printableSurfaces: [{ ...mugProfile.printableSurfaces[0], uvMapping: { ...mugProfile.printableSurfaces[0].uvMapping, frontU: 0.25, seamU: 0.2 } }] };
  const result = validateProduct3DProfileForTemplate(misplacedFront, MUG_CERAMIC_STANDARD_V1_TEMPLATE);
  assert.equal(result.valid, false);
  assert.match(result.errors.join(" "), /frontU|seamU/);
});

test("contrato representa perfiles flat, wrap y garment front/back sin productType", () => {
  const baseSurface = mugProfile.printableSurfaces[0];
  const flat = { ...mugProfile, profileId: "flat-fixture", printableSurfaces: [{ ...baseSurface, printSurfaceId: "flat" }] };
  const wrap = { ...mugProfile, profileId: "wrap-fixture" };
  const garment = { ...mugProfile, profileId: "garment-fixture", printableSurfaces: [
    { ...baseSurface, printSurfaceId: "front", binding: { meshName: "GarmentFront", materialName: "FrontPrint" } },
    { ...baseSurface, printSurfaceId: "back", binding: { meshName: "GarmentBack", materialName: "BackPrint" } },
  ] };
  [flat, wrap, garment].forEach((fixture) => assert.equal(validateProduct3DProfile(fixture).valid, true));
});
