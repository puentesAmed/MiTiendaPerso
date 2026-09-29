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

export function validateModelBindings({ scene, manifest, THREE }) {
  const targets = [];
  for (const binding of manifest.bindings) {
    const mesh = scene.getObjectByName(binding.meshName);
    if (!mesh?.isMesh) throw new Error(`No existe el mesh 3D requerido: ${binding.meshName}.`);
    if (!mesh.geometry?.getAttribute?.("uv")) throw new Error(`El mesh ${binding.meshName} no contiene UVs.`);
    const materials = materialList(mesh.material);
    const materialIndex = materials.findIndex((material) => material?.name === binding.materialName);
    if (materialIndex < 0) throw new Error(`No existe el material ${binding.materialName} en ${binding.meshName}.`);
    targets.push({ binding, mesh, materialIndex, material: materials[materialIndex] });
  }
  const bounds = new THREE.Box3().setFromObject(scene);
  const size = bounds.getSize(new THREE.Vector3());
  if (bounds.isEmpty() || !Number.isFinite(size.x + size.y + size.z) || Math.max(size.x, size.y, size.z) <= 0) throw new Error("El modelo no tiene una bounding box válida.");
  return { targets, bounds, size };
}

export function applyTextureConfiguration(texture, config, THREE) {
  texture.colorSpace = config.colorSpace === "srgb" ? THREE.SRGBColorSpace : THREE.LinearSRGBColorSpace;
  texture.flipY = config.flipY;
  texture.wrapS = THREE[WRAPPING_KEYS[config.wrapS]];
  texture.wrapT = THREE[WRAPPING_KEYS[config.wrapT]];
  texture.offset.set(...config.offset);
  texture.repeat.set(...config.repeat);
  texture.rotation = config.rotation;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.needsUpdate = true;
  return texture;
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
  constructor({ runtime, manifest, onStatus = () => {}, onError = () => {} }) {
    this.runtime = runtime;
    this.manifest = manifest;
    this.onStatus = onStatus;
    this.onError = onError;
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
    this.scene.background = this.manifest.background.alpha === 1 ? new THREE.Color(this.manifest.background.color) : null;
    this.camera = new THREE.PerspectiveCamera(this.manifest.camera.fov, 1, 0.01, 100);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: this.manifest.background.alpha < 1, powerPreference: "high-performance", preserveDrawingBuffer: false });
    this.renderer.setClearColor(this.manifest.background.color, this.manifest.background.alpha);
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
    Object.assign(this.controls, { enableRotate: this.manifest.orbit.enableRotate, enableZoom: this.manifest.orbit.enableZoom, enablePan: this.manifest.orbit.enablePan, enableDamping: this.manifest.orbit.damping > 0, dampingFactor: this.manifest.orbit.damping, autoRotate: false, minPolarAngle: this.manifest.orbit.minPolarAngle, maxPolarAngle: this.manifest.orbit.maxPolarAngle });
    this.addLighting();
    this.observeResize();

    this.onStatus("loading-model");
    const gltf = await new GLTFLoader().loadAsync(this.manifest.asset.url);
    if (this.disposed) {
      disposeObjectResources(collectObjectResources(gltf.scene));
      return;
    }
    this.modelLoadCount += 1;
    this.model = gltf.scene;
    const validation = validateModelBindings({ scene: this.model, manifest: this.manifest, THREE });
    this.bindingTargets = validation.targets;
    this.scene.add(this.model);
    this.frame = calculateCameraFrame({ bounds: validation.bounds, cameraConfig: this.manifest.camera, THREE });
    this.configureCamera();
    this.startRenderLoop();
  }

  addLighting() {
    const { THREE } = this.runtime;
    if (this.manifest.lighting.preset !== "studio-soft") throw new Error("Lighting preset no soportado.");
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
    this.controls.minDistance = distance * this.manifest.orbit.minDistanceFactor;
    this.controls.maxDistance = distance * this.manifest.orbit.maxDistanceFactor;
    this.controls.update();
    this.initialView = { position: position.clone(), target: target.clone() };
  }

  resetView() {
    if (!this.initialView || this.disposed) return;
    this.camera.position.copy(this.initialView.position);
    this.controls.target.copy(this.initialView.target);
    this.controls.update();
  }

  updateArtworks(artworksByView) {
    if (!this.bindingTargets) throw new Error("El modelo 3D aún no está preparado.");
    const { THREE } = this.runtime;
    this.bindingTargets.forEach(({ binding, mesh, materialIndex, material }) => {
      const canvas = artworksByView[binding.sourceViewId];
      if (!canvas) throw new Error(`Falta artwork para la vista ${binding.sourceViewId}.`);
      const key = `${binding.meshName}:${binding.materialName}:${binding.sourceViewId}`;
      let record = this.bindingRecords.get(key);
      if (!record) {
        const clonedMaterial = material.clone();
        const materials = materialList(mesh.material);
        materials[materialIndex] = clonedMaterial;
        mesh.material = Array.isArray(mesh.material) ? materials : clonedMaterial;
        const texture = applyTextureConfiguration(new THREE.CanvasTexture(canvas), binding.texture, THREE);
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

