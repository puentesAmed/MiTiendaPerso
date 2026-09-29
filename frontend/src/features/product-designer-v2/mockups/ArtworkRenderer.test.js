import test from "node:test";
import assert from "node:assert/strict";
import { getArtworkExportGeometry } from "./ArtworkRenderer.js";
import { MUG_CERAMIC_STANDARD_V1_TEMPLATE } from "../templates/mugCeramicStandardV1.js";

test("exporta solo el print area editorial y no el viewport completo", () => {
  const geometry = getArtworkExportGeometry(MUG_CERAMIC_STANDARD_V1_TEMPLATE.views[0], 1200);
  assert.deepEqual(geometry, { canvasWidth: 1200, canvasHeight: 667, crop: { left: 96, top: 93.38000000000001, width: 1008, height: 480.24 } });
  assert.ok(geometry.crop.width < geometry.canvasWidth);
  assert.ok(geometry.crop.height < geometry.canvasHeight);
});

