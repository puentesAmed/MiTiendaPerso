import { getThreeModelAsset } from "./threeModelRegistry.js";

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
  const bounds = new THREE.Box3().setFromObject(scene);
  const size = bounds.getSize(new THREE.Vector3());
  if (bounds.isEmpty() || !Number.isFinite(size.x + size.y + size.z) || Math.max(size.x, size.y, size.z) <= 0) throw new Error("El modelo no tiene una bounding box válida.");
  return { targets, bounds, size };
}

export function applyTextureConfiguration(texture, surface, THREE) {
  const { texture: config, uvMapping } = surface;
  const uRange = uvMapping.uMax - uvMapping.uMin;
  const vRange = uvMapping.vMax - uvMapping.vMin;
  const repeat = uvMapping.repeat ?? [1, 1];
  const offset = uvMapping.offset ?? [0, 0];
  const repeatX = (uvMapping.flipU ? -1 : 1) * repeat[0] / uRange;
  const offsetX = (uvMapping.flipU ? uvMapping.uMax / uRange : -uvMapping.uMin / uRange) + offset[0];
  texture.colorSpace = config.colorSpace === "srgb" ? THREE.SRGBColorSpace : THREE.LinearSRGBColorSpace;
  texture.flipY = uvMapping.flipV;
  texture.wrapS = THREE[WRAPPING_KEYS[config.wrapS]];
  texture.wrapT = THREE[WRAPPING_KEYS[config.wrapT]];
  texture.offset.set(offsetX, (-uvMapping.vMin / vRange) + offset[1]);
  texture.repeat.set(repeatX, repeat[1] / vRange);
  texture.center.set(0.5, 0.5);
  texture.rotation = uvMapping.rotation;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.needsUpdate = true;
  return texture;
}

export function prepareTextureCanvas(sourceCanvas, config, documentApi = globalThis.document) {
  const canvas = documentApi.createElement("canvas");
  canvas.width = sourceCanvas.width;
  canvas.height = sourceCanvas.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D no disponible para preparar la textura.");
  context.fillStyle = config.backgroundColor;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(sourceCanvas, 0, 0);
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
  constructor({ runtime, profile, onStatus = () => {}, onError = () => {}, documentApi = globalThis.document }) {
    this.runtime = runtime;
    this.profile = profile;
    this.onStatus = onStatus;
    this.onError = onError;
    this.documentApi = documentApi;
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
    this.scene.add(this.model);
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

  updateArtworks(artworksBySurface) {
    if (!this.bindingTargets) throw new Error("El modelo 3D aún no está preparado.");
    const { THREE } = this.runtime;
    this.bindingTargets.forEach(({ surface, binding, mesh, materialIndex, material }) => {
      const artworkCanvas = artworksBySurface[surface.printSurfaceId];
      if (!artworkCanvas) throw new Error(`Falta artwork para PrintSurface ${surface.printSurfaceId}.`);
      const canvas = prepareTextureCanvas(artworkCanvas, surface.texture, this.documentApi);
      const key = `${binding.meshName}:${binding.materialName}:${surface.printSurfaceId}`;
      let record = this.bindingRecords.get(key);
      if (!record) {
        const clonedMaterial = material.clone();
        const materials = materialList(mesh.material);
        materials[materialIndex] = clonedMaterial;
        mesh.material = Array.isArray(mesh.material) ? materials : clonedMaterial;
        const texture = applyTextureConfiguration(new THREE.CanvasTexture(canvas), surface, THREE);
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

