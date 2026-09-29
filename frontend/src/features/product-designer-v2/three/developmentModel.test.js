import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { PRODUCT_3D_PROFILES } from "./threeModelRegistry.js";
import { validateModelBindings } from "./ThreePreviewAdapter.js";

test("GLB técnico contiene meshes, materiales imprimibles y UVs esperados", async () => {
  const buffer = await readFile(new URL("../../../../public/models/mug-development-v1.glb", import.meta.url));
  assert.equal(buffer.toString("ascii", 0, 4), "glTF");
  const jsonLength = buffer.readUInt32LE(12);
  const gltf = JSON.parse(buffer.subarray(20, 20 + jsonLength).toString("utf8"));
  assert.deepEqual(gltf.nodes.map((node) => node.name), ["MugBody", "MugBottom", "MugInterior", "MugInnerBottom", "MugRim", "MugHandle"]);
  assert.deepEqual(gltf.materials.map((material) => material.name), ["PrintableSurface", "CeramicDetail"]);
  const body = gltf.meshes[gltf.nodes.find((node) => node.name === "MugBody").mesh];
  const printablePrimitive = body.primitives.find((primitive) => primitive.material === 0 && "TEXCOORD_0" in primitive.attributes);
  assert.ok(printablePrimitive);
  const position = gltf.accessors[printablePrimitive.attributes.POSITION];
  assert.equal(position.min.every(Number.isFinite), true);
  assert.equal(position.max.every(Number.isFinite), true);
  assert.ok(position.max.some((value, index) => value > position.min[index]));
  assert.deepEqual(gltf.materials[0].pbrMetallicRoughness.baseColorFactor ?? [1, 1, 1, 1], [1, 1, 1, 1]);
  assert.equal(gltf.materials.every((material) => material.pbrMetallicRoughness.metallicFactor === 0), true);
});

test("GLTFLoader carga el fixture y valida binding/material/UV/bounds reales", async () => {
  globalThis.ProgressEvent ||= class ProgressEvent {};
  const buffer = await readFile(new URL("../../../../public/models/mug-development-v1.glb", import.meta.url));
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  const gltf = await new Promise((resolve, reject) => new GLTFLoader().parse(arrayBuffer, "", resolve, reject));
  const result = validateModelBindings({ scene: gltf.scene, profile: PRODUCT_3D_PROFILES["mug-ceramic-development-v1"], THREE });
  assert.equal(result.targets[0].mesh.name, "MugBody");
  assert.equal(result.targets[0].material.name, "PrintableSurface");
  assert.ok(Math.max(result.size.x, result.size.y, result.size.z) > 0);

  const body = gltf.scene.getObjectByName("MugBody");
  const positions = body.geometry.getAttribute("position");
  const uvs = body.geometry.getAttribute("uv");
  const frontUvs = [];
  let topV = -Infinity;
  let bottomV = Infinity;
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const z = positions.getZ(index);
    if (z > 0.97) frontUvs.push({ x, u: uvs.getX(index) });
    if (y > 0.79) topV = Math.max(topV, uvs.getY(index));
    if (y < -0.79) bottomV = Math.min(bottomV, uvs.getY(index));
  }
  assert.ok(frontUvs.some(({ x, u }) => x < 0 && u < 0.5));
  assert.ok(frontUvs.some(({ x, u }) => x > 0 && u > 0.5));
  assert.equal(topV, 1);
  assert.equal(bottomV, 0);

  const handleBox = new THREE.Box3().setFromObject(gltf.scene.getObjectByName("MugHandle"));
  assert.ok(handleBox.min.x >= 0.87, "el asa no debe entrar en la cavidad interior");
  assert.ok(handleBox.max.x > 1.5, "el asa debe sobresalir claramente del cuerpo");
});

