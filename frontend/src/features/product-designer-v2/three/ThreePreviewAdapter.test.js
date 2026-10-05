import test from "node:test";
import assert from "node:assert/strict";
import * as THREE from "three";
import { PRODUCT_3D_PROFILES } from "./threeModelRegistry.js";
import { resolveVariantPresentation } from "../domain/variantColors.js";
import { ThreePreviewAdapter, applyTextureConfiguration, calculateCameraFrame, prepareGarmentAtlas, prepareTextureCanvas, validateModelBindings } from "./ThreePreviewAdapter.js";

const profile = PRODUCT_3D_PROFILES["mug-ceramic-development-v1"];
const printableSurface = profile.printableSurfaces[0];
const tshirtProfile = PRODUCT_3D_PROFILES["tshirt-basic-v1"];

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
  const result = validateModelBindings({ scene, profile, THREE });
  assert.equal(result.targets.length, 1);
  assert.ok(result.size.y > 0);
  scene.getObjectByName("MugBody").geometry.deleteAttribute("uv");
  assert.throws(() => validateModelBindings({ scene, profile, THREE }), /UVs/);
});

test("CanvasTexture y camera frame siguen Product3DProfile", () => {
  const texture = new THREE.Texture();
  applyTextureConfiguration(texture, printableSurface, THREE);
  assert.equal(texture.colorSpace, THREE.SRGBColorSpace);
  assert.equal(texture.flipY, true);
  assert.equal(texture.wrapS, THREE.ClampToEdgeWrapping);
  const bounds = new THREE.Box3(new THREE.Vector3(-1, -1, -1), new THREE.Vector3(1, 1, 1));
  const frame = calculateCameraFrame({ bounds, cameraConfig: profile.camera, THREE });
  assert.ok(frame.distance > 2);
  assert.deepEqual(frame.target.toArray(), [0, 0.03, 0]);
});

test("textura compone transparencia sobre el color base declarado", () => {
  const operations = [];
  const output = { getContext: () => ({ set fillStyle(value) { operations.push(["fillStyle", value]); }, fillRect: (...args) => operations.push(["fillRect", ...args]), drawImage: (...args) => operations.push(["drawImage", ...args]) }) };
  const source = { width: 1008, height: 480 };
  const result = prepareTextureCanvas(source, printableSurface.texture, { createElement: () => output });
  assert.equal(result.width, 1008);
  assert.equal(result.height, 480);
  assert.deepEqual(operations[0], ["fillStyle", "#ffffff"]);
  assert.deepEqual(operations[1], ["fillRect", 0, 0, 1008, 480]);
  assert.equal(operations[2][0], "drawImage");
});

test("panel garment conserva alpha cuando declara transparent-overlay", () => {
  const operations = [];
  const output = { getContext: () => ({ set fillStyle(value) { operations.push(["fillStyle", value]); }, clearRect: (...args) => operations.push(["clearRect", ...args]), fillRect: (...args) => operations.push(["fillRect", ...args]), save: () => operations.push(["save"]), translate: (...args) => operations.push(["translate", ...args]), scale: (...args) => operations.push(["scale", ...args]), drawImage: (...args) => operations.push(["drawImage", ...args]), restore: () => operations.push(["restore"]) }) };
  const surface = tshirtProfile.printableSurfaces[1];
  const source = { width: 747, height: 1024 };
  const result = prepareTextureCanvas(source, { ...surface.texture, backgroundColor: "#111111" }, { createElement: () => output }, surface.uvMapping);
  assert.ok(result.width > source.width);
  assert.ok(result.height > source.height);
  assert.deepEqual(operations[0], ["clearRect", 0, 0, result.width, result.height]);
  assert.equal(operations.some(([operation]) => operation === "fillRect"), false);
  assert.ok(operations.some(([operation, x]) => operation === "scale" && x === -1));
});

test("atlas garment conserva transparencia y compone un panel independiente", () => {
  const operations = [];
  const output = { getContext: () => ({ clearRect: (...args) => operations.push(["clearRect", ...args]), save: () => operations.push(["save"]), translate: (...args) => operations.push(["translate", ...args]), scale: (...args) => operations.push(["scale", ...args]), drawImage: (...args) => operations.push(["drawImage", ...args]), restore: () => operations.push(["restore"]) }) };
  const artworks = { "tshirt-front": { width: 754, height: 1024 }, "tshirt-back": { width: 747, height: 1024 }, "tshirt-sleeve-left": { width: 1024, height: 525 }, "tshirt-sleeve-right": { width: 1024, height: 525 } };
  const sleeveBinding = tshirtProfile.artworkComposition.bindings.find((binding) => binding.geometryRegionId === "sleeve-left");
  const atlas = prepareGarmentAtlas(artworks, sleeveBinding, 2048, { createElement: () => output });
  assert.equal(atlas.width, 2048);
  assert.deepEqual(operations[0], ["clearRect", 0, 0, 2048, 2048]);
  assert.equal(operations.some(([operation]) => operation === "fillRect"), false);
  assert.equal(operations.filter(([operation]) => operation === "drawImage").length, 1);
});

test("atlas de manga sin contratar permanece transparente y no exige artwork", () => {
  const operations = [];
  const output = { getContext: () => ({ clearRect: (...args) => operations.push(["clearRect", ...args]), save: () => operations.push(["save"]), translate: () => {}, scale: () => {}, drawImage: (...args) => operations.push(["drawImage", ...args]), restore: () => operations.push(["restore"]) }) };
  const rightBinding = tshirtProfile.artworkComposition.bindings.find((binding) => binding.geometryRegionId === "sleeve-right");
  prepareGarmentAtlas({ "tshirt-front": { width: 754, height: 1024 } }, rightBinding, 2048, { createElement: () => output });
  assert.equal(operations.filter(([operation]) => operation === "drawImage").length, 0);
});

test("BACK aplica mirror una sola vez antes de crear la CanvasTexture", () => {
  const operations = [];
  const output = { getContext: () => ({ clearRect() {}, save() {}, translate() {}, scale: (...args) => operations.push(args), drawImage() {}, restore() {} }) };
  const binding = tshirtProfile.artworkComposition.bindings.find((candidate) => candidate.meshName === "TShirtWebMesh_2" && candidate.geometryRegionId === "back");
  prepareGarmentAtlas({ "tshirt-back": { width: 747, height: 1024 } }, binding, 2048, { createElement: () => output });
  assert.deepEqual(operations, [[-1, 1]]);
  const texture = applyTextureConfiguration(new THREE.Texture(), tshirtProfile.printableSurfaces.find(({ printSurfaceId }) => printSurfaceId === "tshirt-back"), THREE, { precomposedAtlas: true });
  assert.equal(texture.flipY, false);
  assert.deepEqual(texture.repeat.toArray(), [1, 1]);
  assert.deepEqual(texture.offset.toArray(), [0, 0]);
  assert.equal(texture.rotation, 0);
});

test("actualizar artwork reutiliza modelo y textura; dispose es idempotente", () => {
  class FakeCanvasTexture extends THREE.Texture { constructor(image) { super(image); this.image = image; } }
  const runtime = { THREE: { ...THREE, CanvasTexture: FakeCanvasTexture } };
  const { mesh, material } = validScene();
  const documentApi = { createElement: () => { const output = { getContext: () => ({ fillRect() {}, drawImage(source) { output.sourceId = source.id; } }) }; return output; } };
  const adapter = new ThreePreviewAdapter({ runtime, profile, documentApi });
  adapter.bindingTargets = [{ surface: printableSurface, binding: printableSurface.binding, mesh, materialIndex: 0, material }];
  adapter.renderer = { render() {}, domElement: { removeEventListener() {}, remove() {} }, dispose() { this.disposeCalls = (this.disposeCalls || 0) + 1; }, forceContextLoss() { this.lossCalls = (this.lossCalls || 0) + 1; } };
  adapter.scene = {};
  adapter.camera = {};
  adapter.modelLoadCount = 1;
  adapter.updateArtworks({ "wrap-main": { id: "first" } });
  const firstTexture = [...adapter.ownedTextures][0];
  adapter.updateArtworks({ "wrap-main": { id: "second" } });
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

test("cambiar color actualiza materiales sin recargar el GLB", () => {
  const model = new THREE.Group();
  const materials = tshirtProfile.garmentMaterials.map((name) => new THREE.MeshStandardMaterial({ name, color: "#ffffff", map: new THREE.Texture() }));
  const meshes = materials.map((material) => new THREE.Mesh(new THREE.BoxGeometry(), material));
  model.add(...meshes);
  const adapter = new ThreePreviewAdapter({ runtime: { THREE }, profile: tshirtProfile, productVariant: { colorId: "white" } });
  adapter.model = model;
  adapter.renderer = { render() {} };
  adapter.scene = {};
  adapter.camera = {};
  adapter.modelLoadCount = 1;
  adapter.updateMaterialVariant({ colorId: "black" });
  materials.forEach((material) => {
    assert.equal(`#${material.color.getHexString()}`, resolveVariantPresentation({ colorId: "black" }).baseColor);
    assert.equal(material.map, null);
  });
  assert.equal(adapter.modelLoadCount, 1);
});

test("overlay garment reutiliza modelo y texturas al actualizar artwork", () => {
  class FakeCanvasTexture extends THREE.Texture { constructor(image) { super(image); this.image = image; } }
  const runtime = { THREE: { ...THREE, CanvasTexture: FakeCanvasTexture } };
  const model = new THREE.Group();
  const meshes = tshirtProfile.artworkComposition.bindings.map((binding) => {
    const material = new THREE.MeshStandardMaterial({ name: binding.materialName, color: "#ffffff" });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), material);
    mesh.name = binding.meshName;
    model.add(mesh);
    return { binding, mesh, material };
  });
  const documentApi = { createElement: () => ({ getContext: () => ({ clearRect() {}, save() {}, translate() {}, scale() {}, drawImage() {}, restore() {} }) }) };
  const adapter = new ThreePreviewAdapter({ runtime, profile: tshirtProfile, documentApi });
  adapter.model = model;
  adapter.bindingTargets = [];
  adapter.overlayTargets = meshes;
  adapter.renderer = { render() {} };
  adapter.scene = {};
  adapter.camera = {};
  adapter.modelLoadCount = 1;
  const artworks = { "tshirt-front": { width: 754, height: 1024 }, "tshirt-back": { width: 747, height: 1024 }, "tshirt-sleeve-left": { width: 1024, height: 525 }, "tshirt-sleeve-right": { width: 1024, height: 525 } };
  const selectedArtworks = Object.fromEntries(Object.entries(artworks).filter(([id]) => id !== "tshirt-sleeve-right"));
  adapter.updateArtworks(selectedArtworks);
  assert.equal(adapter.ownedTextures.size, 5);
  assert.equal(meshes.find(({ binding }) => binding.geometryRegionId === "sleeve-right").mesh.children.length, 0);
  assert.equal(meshes.find(({ binding }) => binding.geometryRegionId === "sleeve-right").mesh.geometry.type, "BoxGeometry");
  adapter.updateArtworks(artworks);
  const textures = [...adapter.ownedTextures];
  assert.equal(textures.length, 6);
  assert.equal(meshes.every(({ mesh }) => mesh.children[0]?.material.transparent === true), true);
  meshes.forEach(({ mesh }) => {
    const material = mesh.children[0].material;
    assert.equal(material.side, THREE.FrontSide);
    assert.equal(material.depthTest, true);
    assert.equal(material.depthWrite, false);
    assert.equal(material.blending, THREE.NormalBlending);
  });
  adapter.updateArtworks(artworks);
  assert.deepEqual([...adapter.ownedTextures], textures);
  assert.equal(adapter.modelLoadCount, 1);
});

