import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { THREE_MODEL_MANIFESTS } from "./threeModelRegistry.js";
import { validateModelBindings } from "./ThreePreviewAdapter.js";

test("GLB técnico contiene meshes, materiales imprimibles y UVs esperados", async () => {
  const buffer = await readFile(new URL("../../../../public/models/mug-development-v1.glb", import.meta.url));
  assert.equal(buffer.toString("ascii", 0, 4), "glTF");
  const jsonLength = buffer.readUInt32LE(12);
  const gltf = JSON.parse(buffer.subarray(20, 20 + jsonLength).toString("utf8"));
  assert.deepEqual(gltf.nodes.map((node) => node.name), ["MugBody", "MugBottom", "MugHandle"]);
  assert.deepEqual(gltf.materials.map((material) => material.name), ["PrintableSurface", "CeramicDetail"]);
  const body = gltf.meshes[gltf.nodes.find((node) => node.name === "MugBody").mesh];
  const printablePrimitive = body.primitives.find((primitive) => primitive.material === 0 && "TEXCOORD_0" in primitive.attributes);
  assert.ok(printablePrimitive);
  const position = gltf.accessors[printablePrimitive.attributes.POSITION];
  assert.equal(position.min.every(Number.isFinite), true);
  assert.equal(position.max.every(Number.isFinite), true);
  assert.ok(position.max.some((value, index) => value > position.min[index]));
});

test("GLTFLoader carga el fixture y valida binding/material/UV/bounds reales", async () => {
  globalThis.ProgressEvent ||= class ProgressEvent {};
  const buffer = await readFile(new URL("../../../../public/models/mug-development-v1.glb", import.meta.url));
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  const gltf = await new Promise((resolve, reject) => new GLTFLoader().parse(arrayBuffer, "", resolve, reject));
  const result = validateModelBindings({ scene: gltf.scene, manifest: THREE_MODEL_MANIFESTS["mug-development-v1"], THREE });
  assert.equal(result.targets[0].mesh.name, "MugBody");
  assert.equal(result.targets[0].material.name, "PrintableSurface");
  assert.ok(Math.max(result.size.x, result.size.y, result.size.z) > 0);
});

