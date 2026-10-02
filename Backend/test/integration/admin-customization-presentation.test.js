import test from "node:test";
import assert from "node:assert/strict";

import { getAdminCustomizationPresentation, getProductionStatusTargets } from "../../../frontend/src/pages/Admin/customizationPresentation.js";

test("Admin presenta legacy sin exigir productionSurfaces", () => {
  const result = getAdminCustomizationPresentation({ productId: { name: "Legacy" }, previewsBySide: { front: "legacy.png" }, status: "pending", zipUrl: "/legacy.zip" });
  assert.equal(result.isV2, false);
  assert.equal(result.preview, "legacy.png");
  assert.equal(result.bundleReady, true);
});

test("Admin presenta taza V2 con artwork individual y bundle", () => {
  const surface = { viewId: "wrap", preview: { url: "/preview" }, artwork: { downloadUrl: "/artwork", filename: "wrap.png" } };
  const result = getAdminCustomizationPresentation({ schemaVersion: 2, productSnapshot: { name: "Taza" }, productionStatus: "ready", productionBundle: { available: true }, productionSurfaces: [surface] });
  assert.equal(result.product, "Taza");
  assert.equal(result.preview, "/preview");
  assert.deepEqual(result.surfaces, [surface]);
  assert.deepEqual(getProductionStatusTargets("ready"), ["in_production", "issue"]);
});

test("Admin conserva cuatro superficies de camiseta", () => {
  const views = ["front", "back", "sleeve-left", "sleeve-right"];
  const result = getAdminCustomizationPresentation({ schemaVersion: 2, productionSurfaces: views.map((viewId) => ({ viewId, artwork: { filename: `${viewId}.png` } })) });
  assert.deepEqual(result.surfaces.map((surface) => surface.viewId), views);
});
