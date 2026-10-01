import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { TSHIRT_BASIC_V1_TEMPLATE } from "../templates/tshirtBasicV1.js";
import { validateModelBindings } from "./ThreePreviewAdapter.js";
import { PRODUCT_3D_PROFILES } from "./threeModelRegistry.js";
import { analyzeTriangleOrientation, classifyTshirtScene, createFaceSubsetGeometry } from "./tshirtGeometryRegions.js";

async function loadTshirt() {
  globalThis.ProgressEvent ||= class ProgressEvent {};
  globalThis.self ||= globalThis;
  globalThis.createImageBitmap ||= async () => ({ width: 1, height: 1, close() {} });
  const buffer = await readFile(new URL("../../../../public/models/tshirt-web.glb", import.meta.url));
  assert.equal(buffer.toString("ascii", 0, 4), "glTF");
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  return new Promise((resolve, reject) => new GLTFLoader().parse(arrayBuffer, "", resolve, reject));
}

test("tshirt-web enlaza cuatro paneles y overlays de caras exactas", async () => {
  const gltf = await loadTshirt();
  const profile = PRODUCT_3D_PROFILES["tshirt-basic-v1"];
  const result = validateModelBindings({ scene: gltf.scene, profile, THREE });
  assert.equal(TSHIRT_BASIC_V1_TEMPLATE.threeD.profileId, profile.profileId);
  assert.deepEqual(result.targets.map(({ mesh, material }) => [mesh.name, material.name]), [
    ["TShirtWebMesh_1", "TShirtFrontPrintable"],
    ["TShirtWebMesh_2", "TShirtBackPrintable"],
    ["TShirtWebMesh", "TShirtFabric"],
    ["TShirtWebMesh", "TShirtFabric"],
  ]);
  assert.deepEqual(result.targets.map(({ surface }) => surface.printSurfaceId), ["tshirt-front", "tshirt-back", "tshirt-sleeve-left", "tshirt-sleeve-right"]);
  assert.deepEqual(result.overlayTargets.map(({ binding }) => binding.geometryRegionId), ["front", "front", "back", "back", "sleeve-left", "sleeve-right"]);
  assert.equal(result.overlayTargets.every(({ triangleIndices }) => triangleIndices.length > 0), true);
  const correctedByPanel = { front: 0, back: 0, "sleeve-left": 0, "sleeve-right": 0 };
  result.overlayTargets.forEach(({ binding, mesh, triangleIndices }) => {
    correctedByPanel[binding.geometryRegionId] += analyzeTriangleOrientation(mesh.geometry, triangleIndices).inconsistentTriangles.length;
    const subset = createFaceSubsetGeometry(mesh.geometry, triangleIndices);
    assert.equal(subset.index.count, triangleIndices.length * 3);
    assert.ok(subset.getAttribute("uv"));
    const subsetTriangles = Array.from({ length: subset.index.count / 3 }, (_, index) => index);
    assert.equal(analyzeTriangleOrientation(subset, subsetTriangles).inconsistentTriangles.length, 0);
    subset.dispose();
  });
  assert.deepEqual(correctedByPanel, { front: 2, back: 25, "sleeve-left": 0, "sleeve-right": 0 });
  assert.ok(gltf.scene.getObjectByName("TShirtWebMesh")?.material?.name === "TShirtFabric");
});

test("cada face de TShirtFabric pertenece a una región o exclusión explícita sin solapes", async () => {
  const gltf = await loadTshirt();
  const classification = classifyTshirtScene(gltf.scene);
  const fabric = gltf.scene.getObjectByName("TShirtWebMesh").geometry;
  const triangleCount = fabric.index.count / 3;
  const ownership = new Uint8Array(triangleCount);
  for (const entries of Object.values(classification.regions)) {
    for (const entry of entries.filter(({ meshName }) => meshName === "TShirtWebMesh")) {
      entry.triangleIndices.forEach((triangle) => { ownership[triangle] += 1; });
    }
  }
  classification.exclusions.forEach((entry) => entry.triangleIndices.forEach((triangle) => { ownership[triangle] += 1; }));
  assert.equal(ownership.every((owners) => owners === 1), true, "no puede haber faces huérfanas ni solapadas");
  assert.equal(classification.exclusions.some(({ reason }) => reason === "interior"), true);
  assert.equal(classification.exclusions.some(({ reason }) => reason === "collar"), true);
  assert.equal(classification.exclusions.some(({ reason }) => reason === "detail"), true);
  assert.equal(classification.exclusions.some(({ reason }) => reason === "seam"), true);
  ["front", "back", "sleeve-left", "sleeve-right"].forEach((panelId) => assert.ok(classification.regions[panelId].length > 0));
});
