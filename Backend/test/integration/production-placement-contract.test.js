import test from "node:test";
import assert from "node:assert/strict";

import { buildPlacementMetadata, normalizedElementToSurfacePixels } from "../../src/production/placement-contract.js";
import { getProductionTemplate } from "../../src/production/template-catalog.js";
import { buildProductionManifest } from "../../src/utils/generateCustomizationZip.js";

test("placement metadata conserva rotation, z-order y assetId sin runtime Fabric", () => {
  const template = getProductionTemplate("tshirt-basic-v1");
  const surface = template.surfaces[0];
  const document = { views: { front: { elements: [
    { id: "top", type: "image", printAreaId: "front-main", assetId: "asset-persistente", x: 0.3, y: 0.2, width: 0.4, height: 0.3, rotation: 31, opacity: 1, zIndex: 2, hidden: false },
    { id: "bottom", type: "text", printAreaId: "front-main", content: "Texto privado", fontId: "montserrat", x: 0.1, y: 0.7, width: 0.5, height: 0.1, rotation: 0, opacity: 1, zIndex: 0, hidden: false, fontSize: 0.08, color: "#000", textAlign: "left", fontWeight: 500 },
    { id: "middle", type: "shape", printAreaId: "front-main", shapeType: "star", fill: "#6d5dfc", stroke: "#18181b", strokeWidth: 0.003, x: 0.2, y: 0.3, width: 0.2, height: 0.2, rotation: 8, opacity: 0.8, zIndex: 1, hidden: false },
  ] } } };
  const metadata = buildPlacementMetadata({ document, template, surface });
  assert.deepEqual(metadata.elements.map((element) => element.id), ["bottom", "middle", "top"]);
  assert.equal(metadata.elements[2].rotation, 31);
  assert.equal(metadata.elements[2].assetId, "asset-persistente");
  assert.equal(metadata.elements[2].printAreaId, "front-main");
  assert.equal(metadata.elements[0].text.length, 13);
  assert.equal(metadata.elements[0].text.fontId, "montserrat");
  assert.deepEqual(metadata.elements[1].shape, { shapeType: "star", fill: "#6d5dfc", stroke: "#18181b", strokeWidth: 0.003 });
  assert.notEqual(metadata.elements[0].text.contentSha256, "Texto privado");
  assert.doesNotMatch(JSON.stringify(metadata), /scaleX|scaleY|matrix|viewport|blob:|data:image|storageKey|Texto privado/);
});

test("placement y renderer productivo comparten cálculo normalizado", () => {
  const surface = getProductionTemplate("mug-ceramic-standard-v1").surfaces[0];
  const pixels = normalizedElementToSurfacePixels({ x: 0.25, y: 0.1, width: 0.5, height: 0.3, rotation: 45 }, surface);
  assert.deepEqual(pixels, { x: 252, y: 48, width: 504, height: 144, centerX: 504, centerY: 120, rotation: 45 });
});

test("manifest V2 referencia artwork, proof y placement sin storage keys", () => {
  const manifest = buildProductionManifest({
    schemaVersion: 2,
    _id: "507f1f77bcf86cd799439011",
    productId: "507f1f77bcf86cd799439012",
    productSnapshot: { name: "Taza", productTemplateId: "mug-ceramic-standard-v1", templateRevision: 1 },
    quantity: 1,
    productionSurfaces: [{ viewId: "wrap", surfaceId: "wrap-main", label: "Wrap", artwork: { filename: "wrap.png", widthPx: 1008, heightPx: 480, mimeType: "image/png", storageKey: "secret" }, placementProof: { filename: "wrap-placement.png", storageKey: "secret" }, placementMetadata: { filename: "wrap.json", storageKey: "secret" } }],
  });
  assert.equal(manifest.schemaVersion, 2);
  assert.equal(manifest.surfaces[0].placementProofFile, "proofs/wrap-placement.png");
  assert.equal(manifest.surfaces[0].placementMetadataFile, "placement/wrap.json");
  assert.doesNotMatch(JSON.stringify(manifest), /storageKey|secret/);
});
