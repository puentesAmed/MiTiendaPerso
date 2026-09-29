import test from "node:test";
import assert from "node:assert/strict";
import { getArtworkExportGeometry } from "./ArtworkRenderer.js";
import { MUG_CERAMIC_STANDARD_V1_TEMPLATE } from "../templates/mugCeramicStandardV1.js";

test("exporta exactamente la resolución declarada por PrintSurface", () => {
  const geometry = getArtworkExportGeometry(MUG_CERAMIC_STANDARD_V1_TEMPLATE, MUG_CERAMIC_STANDARD_V1_TEMPLATE.views[0], 1200);
  assert.deepEqual(geometry, { canvasWidth: 1008, canvasHeight: 480, crop: { left: 0, top: 0, width: 1008, height: 480 } });
});

