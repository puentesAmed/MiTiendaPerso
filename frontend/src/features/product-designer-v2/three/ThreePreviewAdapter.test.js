import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { THREE_MODEL_MANIFESTS } from "./threeModelRegistry.js";
import { ThreePreviewAdapter, applyTextureConfiguration, calculateCameraFrame, prepareTextureCanvas, validateModelBindings } from "./ThreePreviewAdapter.js";

const manifest = THREE_MODEL_MANIFESTS["mug-development-v1"];

function validScene() {
  const scene = new THREE.Scene();
  const material = new THREE.MeshStandardMaterial({ name: "PrintableSurface" });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), material);
  mesh.name = "MugBody";
  scene.add(mesh);
  return { scene, mesh, material };
}

test("binding exige mesh, material, UV y bounding box válidos", () => {
  const { scene } = validScene();
  const result = validateModelBindings({ scene, manifest, THREE });
  assert.equal(result.targets.length, 1);
  assert.ok(result.size.y > 0);
  scene.getObjectByName("MugBody").geometry.deleteAttribute("uv");
  assert.throws(() => validateModelBindings({ scene, manifest, THREE }), /UVs/);
});

test("CanvasTexture y camera frame siguen el manifest", () => {
  const texture = new THREE.Texture();
  applyTextureConfiguration(texture, manifest.bindings[0].texture, THREE);
  assert.equal(texture.colorSpace, THREE.SRGBColorSpace);
  assert.equal(texture.flipY, false);
  assert.equal(texture.wrapS, THREE.ClampToEdgeWrapping);
  const bounds = new THREE.Box3(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1));
  const frame = calculateCameraFrame({ bounds, cameraConfig: manifest.camera, THREE });
  assert.ok(frame.distance > 2);
  assert.deepEqual(frame.target.toArray(), [0, 0, 0]);
});

test("textura compone transparencia sobre el color base declarado", () => {
  const operations = [];
  const output = { getContext: () => ({ set fillStyle(value) { operations.push(["fillStyle", value]); }, fillRect: (...args) => operations.push(["fillRect", ...args]), drawImage: (...args) => operations.push(["drawImage", ...args]) }) };
  const source = { width: 1008, height: 480 };
  const result = prepareTextureCanvas(source, manifest.bindings[0].texture, { createElement: () => output });
  assert.equal(result.width, 1008);
  assert.equal(result.height, 480);
  assert.deepEqual(operations[0], ["fillStyle", "#ffffff"]);
  assert.deepEqual(operations[1], ["fillRect", 0, 0, 1008, 480]);
  assert.equal(operations[2][0], "drawImage");
});

test("actualizar artwork reutiliza modelo y textura; dispose es idempotente", () => {
  class FakeCanvasTexture extends THREE.Texture { constructor(image) { super(image); this.image = image; } }
  const runtime = { THREE: { ...THREE, CanvasTexture: FakeCanvasTexture } };
  const { mesh, material } = validScene();
  const documentApi = { createElement: () => { const output = { getContext: () => ({ fillRect() {}, drawImage(source) { output.sourceId = source.id; } }) }; return output; } };
  const adapter = new ThreePreviewAdapter({ runtime, manifest, documentApi });
  adapter.bindingTargets = [{ binding: manifest.bindings[0], mesh, materialIndex: 0, material }];
  adapter.renderer = { render() {}, domElement: { removeEventListener() {}, remove() {} }, dispose() { this.disposeCalls = (this.disposeCalls || 0) + 1; }, forceContextLoss() { this.lossCalls = (this.lossCalls || 0) + 1; } };
  adapter.scene = {};
  adapter.camera = {};
  adapter.modelLoadCount = 1;
  adapter.updateArtworks({ wrap: { id: "first" } });
  const firstTexture = [...adapter.ownedTextures][0];
  adapter.updateArtworks({ wrap: { id: "second" } });
  assert.equal([...adapter.ownedTextures][0], firstTexture);
  assert.equal(firstTexture.image.sourceId, "second");
  assert.equal(adapter.modelLoadCount, 1);
  let controlsDisposed = 0;
  let observerDisconnected = 0;
  adapter.controls = { dispose: () => { controlsDisposed += 1; } };
  adapter.resizeObserver = { disconnect: () => { observerDisconnected += 1; } };
  adapter.model = { traverse: () => {} };
  adapter.dispose();
  adapter.dispose();
  assert.equal(controlsDisposed, 1);
  assert.equal(observerDisconnected, 1);
  assert.equal(adapter.renderer.disposeCalls, 1);
  assert.equal(adapter.renderer.lossCalls, 1);
});

