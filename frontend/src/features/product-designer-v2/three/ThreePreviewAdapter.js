import { getMaterialVariant, getThreeModelAsset } from "./threeModelRegistry.js";
import { uvRectToAtlasPixels } from "../domain/tshirtSurfaceCalibration.js";
import { classifyGeometryRegions } from "./geometryRegionRegistry.js";
import { createFaceSubsetGeometry, resolveRegionTriangles } from "./tshirtGeometryRegions.js";

const WRAPPING_KEYS = { clamp: "ClampToEdgeWrapping", repeat: "RepeatWrapping", mirror: "MirroredRepeatWrapping" };

function materialList(material) {
  return Array.isArray(material) ? material : [material];
}

function collectObjectResources(model, extraMaterials = [], extraTextures = []) {
  const geometries = new Set();
  const materials = new Set(extraMaterials.filter(Boolean));
  const textures = new Set(extraTextures.filter(Boolean));
  model?.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    materialList(object.material).filter(Boolean).forEach((material) => materials.add(material));
  });
  materials.forEach((material) => Object.values(material).forEach((value) => {
    if (value?.isTexture) textures.add(value);
  }));
  return { geometries, materials, textures };
}

function disposeObjectResources(resources) {
  resources.geometries.forEach((geometry) => geometry.dispose());
  resources.textures.forEach((texture) => texture.dispose());
  resources.materials.forEach((material) => material.dispose());
}

export function validateModelBindings({ scene, profile, THREE }) {
  const targets = [];
  for (const surface of profile.printableSurfaces) {
    const { binding } = surface;
    const mesh = scene.getObjectByName(binding.meshName);
    if (!mesh?.isMesh) throw new Error(`No existe el mesh 3D requerido: ${binding.meshName}.`);
    if (!mesh.geometry?.getAttribute?.("uv")) throw new Error(`El mesh ${binding.meshName} no contiene UVs.`);
    const materials = materialList(mesh.material);
    const materialIndex = materials.findIndex((material) => material?.name === binding.materialName);
    if (materialIndex < 0) throw new Error(`No existe el material ${binding.materialName} en ${binding.meshName}.`);
    targets.push({ surface, binding, mesh, materialIndex, material: materials[materialIndex] });
  }
  const classification = classifyGeometryRegions(profile.artworkComposition?.geometryClassifierId, scene);
  const overlayTargets = (profile.artworkComposition?.bindings || []).map((binding) => {
    const mesh = scene.getObjectByName(binding.meshName);
    if (!mesh?.isMesh || !mesh.geometry?.getAttribute?.("uv")) throw new Error(`No existe el mesh UV requerido por artworkComposition: ${binding.meshName}.`);
    const materials = materialList(mesh.material);
    const materialIndex = materials.findIndex((material) => material?.name === binding.materialName);
    if (materialIndex < 0) throw new Error(`No existe el material ${binding.materialName} en ${binding.meshName}.`);
    const triangleIndices = binding.geometryRegionId ? resolveRegionTriangles(classification, binding.meshName, binding.geometryRegionId) : null;
    if (binding.geometryRegionId && triangleIndices.length === 0) return null;
    return { binding, mesh, materialIndex, material: materials[materialIndex], triangleIndices };
  }).filter(Boolean);
  const bounds = new THREE.Box3().setFromObject(scene);
  const size = bounds.getSize(new THREE.Vector3());
  if (bounds.isEmpty() || !Number.isFinite(size.x + size.y + size.z) || Math.max(size.x, size.y, size.z) <= 0) throw new Error("El modelo no tiene una bounding box válida.");
  return { targets, overlayTargets, bounds, size };
}

function usesUvAtlas(surface) {
  const uv = surface.uvMapping;
  return uv.uMin !== 0 || uv.uMax !== 1 || uv.vMin !== 0 || uv.vMax !== 1;
}

export function applyTextureConfiguration(texture, surface, THREE, { precomposedAtlas = false } = {}) {
  const { texture: config, uvMapping } = surface;
  const uRange = uvMapping.uMax - uvMapping.uMin;
  const vRange = uvMapping.vMax - uvMapping.vMin;
  const repeat = uvMapping.repeat ?? [1, 1];
  const offset = uvMapping.offset ?? [0, 0];
  const repeatX = (uvMapping.flipU ? -1 : 1) * repeat[0] / uRange;
  const offsetX = (uvMapping.flipU ? uvMapping.uMax / uRange : -uvMapping.uMin / uRange) + offset[0];
  texture.colorSpace = config.colorSpace === "srgb" ? THREE.SRGBColorSpace : THREE.LinearSRGBColorSpace;
  texture.flipY = precomposedAtlas ? false : uvMapping.flipV;
  texture.wrapS = THREE[WRAPPING_KEYS[config.wrapS]];
  texture.wrapT = THREE[WRAPPING_KEYS[config.wrapT]];
  texture.offset.set(precomposedAtlas ? 0 : offsetX, precomposedAtlas ? 0 : (-uvMapping.vMin / vRange) + offset[1]);
  texture.repeat.set(precomposedAtlas ? 1 : repeatX, precomposedAtlas ? 1 : repeat[1] / vRange);
  texture.center.set(0.5, 0.5);
  texture.rotation = precomposedAtlas ? 0 : uvMapping.rotation;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.needsUpdate = true;
  return texture;
}

export function prepareTextureCanvas(sourceCanvas, config, documentApi = globalThis.document, uvMapping = null) {
  const canvas = documentApi.createElement("canvas");
  const precomposedAtlas = uvMapping && (uvMapping.uMin !== 0 || uvMapping.uMax !== 1 || uvMapping.vMin !== 0 || uvMapping.vMax !== 1);
  const uRange = precomposedAtlas ? uvMapping.uMax - uvMapping.uMin : 1;
  const vRange = precomposedAtlas ? uvMapping.vMax - uvMapping.vMin : 1;
  canvas.width = precomposedAtlas ? Math.round(sourceCanvas.width / uRange) : sourceCanvas.width;
  canvas.height = precomposedAtlas ? Math.round(sourceCanvas.height / vRange) : sourceCanvas.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D no disponible para preparar la textura.");
  if (config.composition === "transparent-overlay") context.clearRect(0, 0, canvas.width, canvas.height);
  else {
    context.fillStyle = config.backgroundColor;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  if (!precomposedAtlas) context.drawImage(sourceCanvas, 0, 0);
  else {
    const x = uvMapping.uMin * canvas.width;
    const y = (1 - uvMapping.vMax) * canvas.height;
    const width = uRange * canvas.width;
    const height = vRange * canvas.height;
    context.save();
    if (uvMapping.flipU) {
      context.translate(x + width, 0);
      context.scale(-1, 1);
      context.drawImage(sourceCanvas, 0, y, width, height);
    } else context.drawImage(sourceCanvas, x, y, width, height);
    context.restore();
  }
  return canvas;
}

export function prepareGarmentAtlas(artworksBySurface, binding, atlasSize, documentApi = globalThis.document) {
  const canvas = documentApi.createElement("canvas");
  canvas.width = atlasSize;
  canvas.height = atlasSize;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D no disponible para preparar el atlas garment.");
  context.clearRect(0, 0, atlasSize, atlasSize);
  binding.regions.forEach((region) => {
    const source = artworksBySurface[region.printSurfaceId];
    if (!source) return;
    const sourceRect = {
      x: region.editorRect.x * source.width,
      y: region.editorRect.y * source.height,
      width: region.editorRect.width * source.width,
      height: region.editorRect.height * source.height,
    };
    const target = uvRectToAtlasPixels(region.uvMapping, atlasSize);
    context.save();
    if (region.uvMapping.flipU) {
      context.translate(target.x + target.width, 0);
      context.scale(-1, 1);
      context.drawImage(source, sourceRect.x, sourceRect.y, sourceRect.width, sourceRect.height, 0, target.y, target.width, target.height);
    } else context.drawImage(source, sourceRect.x, sourceRect.y, sourceRect.width, sourceRect.height, target.x, target.y, target.width, target.height);
    context.restore();
  });
  return canvas;
}

export function calculateCameraFrame({ bounds, cameraConfig, THREE }) {
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const maxDimension = Math.max(size.x, size.y, size.z);
  const fovRadians = THREE.MathUtils.degToRad(cameraConfig.fov);
  const distance = (maxDimension / (2 * Math.tan(fovRadians / 2))) * cameraConfig.fitPadding;
  const direction = new THREE.Vector3(...cameraConfig.direction).normalize();
  const target = center.clone().add(new THREE.Vector3(...cameraConfig.targetOffset));
  return { center, size, distance, target, position: target.clone().add(direction.multiplyScalar(distance)) };
}

export class ThreePreviewAdapter {
  constructor({ runtime, profile, productVariant = null, onStatus = () => {}, onError = () => {}, documentApi = globalThis.document }) {
    this.runtime = runtime;
    this.profile = profile;
    this.onStatus = onStatus;
    this.onError = onError;
    this.documentApi = documentApi;
    this.productVariant = productVariant;
    this.materialVariant = getMaterialVariant(profile, productVariant);
    this.bindingRecords = new Map();
    this.ownedTextures = new Set();
    this.disposed = false;
    this.modelLoadCount = 0;
  }

  async init(container) {
    if (!container) throw new Error("Contenedor 3D no disponible.");
    const { THREE, GLTFLoader, OrbitControls } = this.runtime;
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = this.profile.background.alpha === 1 ? new THREE.Color(this.profile.background.color) : null;
    this.camera = new THREE.PerspectiveCamera(this.profile.camera.fov, 1, 0.01, 100);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: this.profile.background.alpha < 1, powerPreference: "high-performance", preserveDrawingBuffer: false });
    this.renderer.setClearColor(this.profile.background.color, this.profile.background.alpha);
    this.renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.domElement.setAttribute("role", "img");
    this.renderer.domElement.setAttribute("aria-label", "Vista 3D interactiva del producto personalizado");
    this.renderer.domElement.setAttribute("aria-description", "Arrastra para rotar y usa la rueda o un gesto de pinza para ampliar.");
    this.renderer.domElement.style.width = "100%";
    this.renderer.domElement.style.height = "100%";
    this.renderer.domElement.style.display = "block";
    container.appendChild(this.renderer.domElement);

    this.contextLostHandler = (event) => {
      event.preventDefault();
      this.onError("Se perdió el contexto gráfico WebGL. Vuelve a abrir la vista 3D.");
    };
    this.renderer.domElement.addEventListener("webglcontextlost", this.contextLostHandler);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    Object.assign(this.controls, { enableRotate: this.profile.orbit.enableRotate, enableZoom: this.profile.orbit.enableZoom, enablePan: this.profile.orbit.enablePan, enableDamping: this.profile.orbit.damping > 0, dampingFactor: this.profile.orbit.damping, autoRotate: false, minPolarAngle: this.profile.orbit.minPolarAngle, maxPolarAngle: this.profile.orbit.maxPolarAngle });
    this.addLighting();
    this.observeResize();

    this.onStatus("loading-model");
    const asset = getThreeModelAsset(this.profile.modelId);
    if (!asset) throw new Error(`No existe el asset 3D registrado: ${this.profile.modelId}.`);
    const gltf = await new GLTFLoader().loadAsync(asset.url);
    if (this.disposed) {
      disposeObjectResources(collectObjectResources(gltf.scene));
      return;
    }
    this.modelLoadCount += 1;
    this.model = gltf.scene;
    const validation = validateModelBindings({ scene: this.model, profile: this.profile, THREE });
    this.bindingTargets = validation.targets;
    this.overlayTargets = validation.overlayTargets;
    this.scene.add(this.model);
    this.updateMaterialVariant(this.productVariant);
    this.frame = calculateCameraFrame({ bounds: validation.bounds, cameraConfig: this.profile.camera, THREE });
    this.configureCamera();
    this.startRenderLoop();
  }

  addLighting() {
    const { THREE } = this.runtime;
    if (this.profile.lighting.preset !== "studio-soft") throw new Error("Lighting preset no soportado.");
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x667085, 1.55));
    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(3, 4, 5);
    const fill = new THREE.DirectionalLight(0xbdd7ff, 1.1);
    fill.position.set(-4, 1.5, 3);
    const rim = new THREE.DirectionalLight(0xffe2c2, 0.85);
    rim.position.set(1, 2, -4);
    this.scene.add(key, fill, rim);
  }

  configureCamera() {
    const { distance, position, target } = this.frame;
    this.camera.near = Math.max(distance / 100, 0.01);
    this.camera.far = distance * 20;
    this.camera.position.copy(position);
    this.camera.updateProjectionMatrix();
    this.controls.target.copy(target);
    this.controls.minDistance = distance * this.profile.orbit.minDistanceFactor;
    this.controls.maxDistance = distance * this.profile.orbit.maxDistanceFactor;
    this.controls.update();
    this.initialView = { position: position.clone(), target: target.clone() };
  }

  resetView() {
    if (!this.initialView || this.disposed) return;
    this.camera.position.copy(this.initialView.position);
    this.controls.target.copy(this.initialView.target);
    this.controls.update();
  }

  updateMaterialVariant(productVariant) {
    this.productVariant = productVariant;
    this.materialVariant = getMaterialVariant(this.profile, productVariant);
    if (!this.model || !this.materialVariant) return;
    const configurations = new Map(this.materialVariant.materials.map((material) => [material.materialName, material]));
    const printableMaterialNames = new Set(this.profile.printableSurfaces.map((surface) => surface.binding.materialName));
    const transparentOverlay = this.profile.artworkComposition?.mode === "transparent-overlay";
    const garmentMaterialNames = new Set(this.profile.garmentMaterials || []);
    this.model.traverse((object) => {
      materialList(object.material).filter(Boolean).forEach((material) => {
        const configuration = configurations.get(material.name);
        if (!configuration) return;
        material.color?.set(transparentOverlay ? configuration.color : printableMaterialNames.has(material.name) ? "#ffffff" : configuration.color);
        if (transparentOverlay && garmentMaterialNames.has(material.name)) material.map = null;
        material.roughness = configuration.roughness;
        material.metalness = configuration.metalness;
        material.needsUpdate = true;
      });
    });
    this.renderer?.render?.(this.scene, this.camera);
  }

  materialBaseColor(materialName, fallback) {
    return this.materialVariant?.materials.find((material) => material.materialName === materialName)?.color || fallback;
  }

  updateArtworks(artworksBySurface) {
    if (!this.bindingTargets) throw new Error("El modelo 3D aún no está preparado.");
    if (this.profile.artworkComposition?.mode === "transparent-overlay") {
      this.updateOverlayArtworks(artworksBySurface);
      return;
    }
    const { THREE } = this.runtime;
    this.bindingTargets.forEach(({ surface, binding, mesh, materialIndex, material }) => {
      const artworkCanvas = artworksBySurface[surface.printSurfaceId];
      if (!artworkCanvas) return;
      const canvas = prepareTextureCanvas(artworkCanvas, { ...surface.texture, backgroundColor: this.materialBaseColor(binding.materialName, surface.texture.backgroundColor) }, this.documentApi, surface.uvMapping);
      const key = `${binding.meshName}:${binding.materialName}:${surface.printSurfaceId}`;
      let record = this.bindingRecords.get(key);
      if (!record) {
        const clonedMaterial = material.clone();
        const materials = materialList(mesh.material);
        materials[materialIndex] = clonedMaterial;
        mesh.material = Array.isArray(mesh.material) ? materials : clonedMaterial;
        clonedMaterial.color?.set("#ffffff");
        const texture = applyTextureConfiguration(new THREE.CanvasTexture(canvas), surface, THREE, { precomposedAtlas: usesUvAtlas(surface) });
        clonedMaterial.map = texture;
        clonedMaterial.needsUpdate = true;
        record = { material: clonedMaterial, originalMaterial: material, texture };
        this.bindingRecords.set(key, record);
        this.ownedTextures.add(texture);
      } else {
        record.texture.image = canvas;
        record.texture.needsUpdate = true;
      }
    });
    this.renderer.render(this.scene, this.camera);
  }

  updateOverlayArtworks(artworksBySurface) {
    const { THREE } = this.runtime;
    this.overlayTargets.forEach(({ binding, mesh, material, triangleIndices }) => {
      if (!binding.regions.some((region) => artworksBySurface[region.printSurfaceId])) return;
      const canvas = prepareGarmentAtlas(artworksBySurface, binding, this.profile.artworkComposition.atlasSize, this.documentApi);
      const key = `overlay:${binding.meshName}:${binding.materialName}:${binding.geometryRegionId || "all"}`;
      let record = this.bindingRecords.get(key);
      if (!record) {
        const overlayMaterial = material.clone();
        overlayMaterial.name = `${material.name}ArtworkOverlay`;
        overlayMaterial.color?.set("#ffffff");
        overlayMaterial.map = applyTextureConfiguration(new THREE.CanvasTexture(canvas), { texture: { colorSpace: "srgb", wrapS: "clamp", wrapT: "clamp" }, uvMapping: { uMin: 0, uMax: 1, vMin: 0, vMax: 1, flipU: false, flipV: false, rotation: 0 } }, THREE, { precomposedAtlas: true });
        overlayMaterial.side = THREE.FrontSide;
        overlayMaterial.transparent = true;
        overlayMaterial.depthTest = true;
        overlayMaterial.depthWrite = false;
        overlayMaterial.blending = THREE.NormalBlending;
        overlayMaterial.alphaTest = 0.001;
        overlayMaterial.polygonOffset = true;
        // One depth unit prevents coplanar z-fighting without moving the overlay mesh.
        overlayMaterial.polygonOffsetFactor = -1;
        overlayMaterial.polygonOffsetUnits = -1;
        overlayMaterial.needsUpdate = true;
        const overlayGeometry = triangleIndices ? createFaceSubsetGeometry(mesh.geometry, triangleIndices) : mesh.geometry;
        const overlay = new THREE.Mesh(overlayGeometry, overlayMaterial);
        overlay.name = `${mesh.name}ArtworkOverlay`;
        overlay.renderOrder = mesh.renderOrder + 1;
        mesh.add(overlay);
        record = { overlay, material: overlayMaterial, texture: overlayMaterial.map, ownedGeometry: triangleIndices ? overlayGeometry : null };
        this.bindingRecords.set(key, record);
        this.ownedTextures.add(overlayMaterial.map);
      } else {
        record.texture.image = canvas;
        record.texture.needsUpdate = true;
      }
    });
    this.renderer.render(this.scene, this.camera);
  }

  observeResize() {
    const resize = (width, height) => {
      if (this.disposed || !width || !height) return;
      this.renderer.setSize(width, height, false);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
    };
    const rect = this.container.getBoundingClientRect();
    resize(Math.max(1, rect.width), Math.max(1, rect.height));
    this.resizeObserver = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      resize(Math.max(1, width), Math.max(1, height));
    });
    this.resizeObserver.observe(this.container);
  }

  startRenderLoop() {
    const render = () => {
      if (this.disposed) return;
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
      this.animationFrame = requestAnimationFrame(render);
    };
    render();
  }

  capturePreviewBlob() {
    if (this.disposed) return Promise.reject(new Error("Preview 3D no disponible."));
    this.renderer.render(this.scene, this.camera);
    return new Promise((resolve, reject) => this.renderer.domElement.toBlob((blob) => blob ? resolve(blob) : reject(new Error("No se pudo capturar el preview 3D.")), "image/png"));
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    if (this.animationFrame) cancelAnimationFrame(this.animationFrame);
    this.resizeObserver?.disconnect();
    this.controls?.dispose();
    this.renderer?.domElement.removeEventListener("webglcontextlost", this.contextLostHandler);
    const originalMaterials = [...this.bindingRecords.values()].map((record) => record.originalMaterial);
    disposeObjectResources(collectObjectResources(this.model, originalMaterials, [...this.ownedTextures]));
    this.bindingRecords.clear();
    this.renderer?.dispose();
    this.renderer?.forceContextLoss();
    this.renderer?.domElement.remove();
  }
}

