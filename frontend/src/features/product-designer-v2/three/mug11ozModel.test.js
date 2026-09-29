import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MUG_CERAMIC_STANDARD_V1_TEMPLATE } from "../templates/mugCeramicStandardV1.js";
import { validateModelBindings } from "./ThreePreviewAdapter.js";
import { PRODUCT_3D_PROFILES } from "./threeModelRegistry.js";
import { createUvCalibrationDefinition } from "./uvCalibrationFixture.js";

async function loadCandidate() {
  globalThis.ProgressEvent ||= class ProgressEvent {};
  const buffer = await readFile(new URL("../../../../public/models/mug-11oz-v1.glb", import.meta.url));
  assert.equal(buffer.toString("ascii", 0, 4), "glTF");
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  return new Promise((resolve, reject) => new GLTFLoader().parse(arrayBuffer, "", resolve, reject));
}

test("mug-11oz-v1 carga con binding, materiales y partes estructurales válidas", async () => {
  const gltf = await loadCandidate();
  const profile = PRODUCT_3D_PROFILES["mug-11oz-v1"];
  const result = validateModelBindings({ scene: gltf.scene, profile, THREE });

  assert.equal(MUG_CERAMIC_STANDARD_V1_TEMPLATE.threeD.profileId, profile.profileId);
  assert.equal(result.targets[0].mesh.name, "MugBody");
  assert.equal(result.targets[0].material.name, "PrintableSurface");
  assert.deepEqual(
    ["MugBody", "CeramicDetailSurface", "CeramicDetail", "MugBottom", "MugHandle"].map((name) => Boolean(gltf.scene.getObjectByName(name))),
    [true, true, true, true, true],
  );

  const printableMeshes = [];
  gltf.scene.traverse((object) => {
    if (object.isMesh && object.material?.name === "PrintableSurface") printableMeshes.push(object.name);
  });
  assert.deepEqual(printableMeshes, ["MugBody"]);
  assert.ok(Math.max(result.size.x, result.size.y, result.size.z) > 0);

  const handleBounds = new THREE.Box3().setFromObject(gltf.scene.getObjectByName("MugHandle"));
  assert.ok(handleBounds.max.z < -0.035, "el asa no debe entrar en la cavidad interior");
  assert.ok(handleBounds.min.z < -0.07, "el asa debe sobresalir claramente del cuerpo");
});

test("mug-11oz-v1 cumple wrap-main y el fixture UV sin correcciones del adapter", async () => {
  const gltf = await loadCandidate();
  const body = gltf.scene.getObjectByName("MugBody");
  const positions = body.geometry.getAttribute("position");
  const uvs = body.geometry.getAttribute("uv");
  const profileSurface = PRODUCT_3D_PROFILES["mug-11oz-v1"].printableSurfaces[0];
  const fixture = createUvCalibrationDefinition();
  const frontLabel = fixture.labels.find((label) => label.text === "FRONT");

  assert.equal(frontLabel.x, profileSurface.uvMapping.frontU);
  assert.equal(profileSurface.uvMapping.seamU, 0);
  assert.equal(profileSurface.uvMapping.flipU, false);
  assert.equal(profileSurface.uvMapping.flipV, true);

  let minU = Infinity;
  let maxU = -Infinity;
  let topV = -Infinity;
  let bottomV = Infinity;
  const front = [];
  const seam = [];
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const z = positions.getZ(index);
    const u = uvs.getX(index);
    const v = uvs.getY(index);
    minU = Math.min(minU, u);
    maxU = Math.max(maxU, u);
    if (y > 0.095) topV = Math.max(topV, v);
    if (y < 0.01) bottomV = Math.min(bottomV, v);
    if (z > 0.039) front.push({ x, u });
    if (z < -0.039) seam.push(u);
  }

  assert.ok(minU >= -1e-6 && maxU <= 1 + 1e-6);
  assert.ok(front.some(({ x, u }) => x < 0 && u < 0.5));
  assert.ok(front.some(({ x, u }) => x > 0 && u > 0.5));
  assert.ok(front.some(({ u }) => Math.abs(u - 0.5) < 1e-6));
  assert.ok(seam.some((u) => Math.abs(u) < 1e-6));
  assert.ok(seam.some((u) => Math.abs(u - 1) < 1e-6));
  assert.equal(topV, 1);
  assert.equal(bottomV, 0);
});
