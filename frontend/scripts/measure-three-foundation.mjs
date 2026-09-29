import { readFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { fileURLToPath } from "node:url";
import { loadThreeRuntime } from "../src/features/product-designer-v2/three/threeRuntime.js";
import { applyTextureConfiguration, validateModelBindings } from "../src/features/product-designer-v2/three/ThreePreviewAdapter.js";
import { THREE_MODEL_MANIFESTS } from "../src/features/product-designer-v2/three/threeModelRegistry.js";

globalThis.ProgressEvent ||= class ProgressEvent {};

const manifest = THREE_MODEL_MANIFESTS["mug-development-v1"];
const runtimeStarted = performance.now();
const runtime = await loadThreeRuntime();
const runtimeMs = performance.now() - runtimeStarted;
const modelPath = fileURLToPath(new URL("../public/models/mug-development-v1.glb", import.meta.url));
const model = await readFile(modelPath);
const arrayBuffer = model.buffer.slice(model.byteOffset, model.byteOffset + model.byteLength);
const parseStarted = performance.now();
const gltf = await new Promise((resolve, reject) => new runtime.GLTFLoader().parse(arrayBuffer, "", resolve, reject));
const parseMs = performance.now() - parseStarted;
validateModelBindings({ scene: gltf.scene, manifest, THREE: runtime.THREE });
const textureStarted = performance.now();
const texture = applyTextureConfiguration(new runtime.THREE.CanvasTexture({ width: 1008, height: 480 }), manifest.bindings[0].texture, runtime.THREE);
texture.image = { width: 1008, height: 480, revision: 2 };
texture.needsUpdate = true;
const textureUpdateMs = performance.now() - textureStarted;
texture.dispose();

console.log(JSON.stringify({ runtimeMs: Number(runtimeMs.toFixed(2)), modelParseMs: Number(parseMs.toFixed(2)), textureUpdateMs: Number(textureUpdateMs.toFixed(3)), modelBytes: model.byteLength, textureDimensions: [1008, 480] }, null, 2));
