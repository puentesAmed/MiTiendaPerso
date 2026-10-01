import test from "node:test";
import assert from "node:assert/strict";
import { getArtworkExportGeometry } from "./ArtworkRenderer.js";
import { MUG_CERAMIC_STANDARD_V1_TEMPLATE } from "../templates/mugCeramicStandardV1.js";
import { TSHIRT_BASIC_V1_TEMPLATE } from "../templates/tshirtBasicV1.js";

test("exporta exactamente la resolución declarada por PrintSurface", () => {
  const geometry = getArtworkExportGeometry(MUG_CERAMIC_STANDARD_V1_TEMPLATE, MUG_CERAMIC_STANDARD_V1_TEMPLATE.views[0], 1200);
  assert.deepEqual(geometry, { canvasWidth: 1008, canvasHeight: 480, crop: { left: 0, top: 0, width: 1008, height: 480 } });
});

test("los cuatro paneles producen canvases editoriales independientes", () => {
  assert.deepEqual(getArtworkExportGeometry(TSHIRT_BASIC_V1_TEMPLATE, TSHIRT_BASIC_V1_TEMPLATE.views[0]), { canvasWidth: 754, canvasHeight: 1024, crop: { left: 0, top: 0, width: 754, height: 1024 } });
  assert.deepEqual(getArtworkExportGeometry(TSHIRT_BASIC_V1_TEMPLATE, TSHIRT_BASIC_V1_TEMPLATE.views[1]), { canvasWidth: 747, canvasHeight: 1024, crop: { left: 0, top: 0, width: 747, height: 1024 } });
  assert.deepEqual(getArtworkExportGeometry(TSHIRT_BASIC_V1_TEMPLATE, TSHIRT_BASIC_V1_TEMPLATE.views[2]), { canvasWidth: 1024, canvasHeight: 525, crop: { left: 0, top: 0, width: 1024, height: 525 } });
  assert.deepEqual(getArtworkExportGeometry(TSHIRT_BASIC_V1_TEMPLATE, TSHIRT_BASIC_V1_TEMPLATE.views[3]), { canvasWidth: 1024, canvasHeight: 525, crop: { left: 0, top: 0, width: 1024, height: 525 } });
});

test("GarmentGuide no altera la geometría exportada ni entra en ArtworkRenderer", () => {
  for (const view of TSHIRT_BASIC_V1_TEMPLATE.views) {
    const surface = TSHIRT_BASIC_V1_TEMPLATE.printSurfaces.find((candidate) => candidate.id === view.printSurfaceId);
    const geometry = getArtworkExportGeometry(TSHIRT_BASIC_V1_TEMPLATE, view);
    assert.deepEqual(geometry.crop, { left: 0, top: 0, width: surface.previewTextureResolution.width, height: surface.previewTextureResolution.height });
    assert.equal(JSON.stringify(geometry).includes(view.editorPresentation.guideId), false);
  }
});

