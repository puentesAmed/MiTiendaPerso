const COLOR_SPACES = new Set(["srgb", "linear"]);
const WRAPS = new Set(["clamp", "repeat", "mirror"]);
const LIGHTING_PRESETS = new Set(["studio-soft"]);

export const THREE_MODEL_MANIFESTS = Object.freeze({
  "mug-development-v1": Object.freeze({
    schemaVersion: 1,
    revision: 2,
    modelId: "mug-development-v1",
    asset: Object.freeze({ url: "/models/mug-development-v1.glb", kind: "development", origin: "generated-in-project" }),
    bindings: Object.freeze([
      Object.freeze({
        sourceViewId: "wrap",
        meshName: "MugBody",
        materialName: "PrintableSurface",
        texture: Object.freeze({ colorSpace: "srgb", backgroundColor: "#ffffff", flipY: true, wrapS: "clamp", wrapT: "clamp", offset: Object.freeze([0, 0]), repeat: Object.freeze([1, 1]), rotation: 0 }),
      }),
    ]),
    camera: Object.freeze({ fov: 32, direction: Object.freeze([0.28, 0.12, 1]), targetOffset: Object.freeze([0, 0.03, 0]), fitPadding: 1.28 }),
    orbit: Object.freeze({ enableRotate: true, enableZoom: true, enablePan: false, minDistanceFactor: 0.82, maxDistanceFactor: 1.9, minPolarAngle: 0.65, maxPolarAngle: 2.35, damping: 0.075 }),
    background: Object.freeze({ color: "#f3f4f6", alpha: 1 }),
    lighting: Object.freeze({ preset: "studio-soft" }),
  }),
});

function vector(value, length, { positive = false } = {}) {
  return Array.isArray(value) && value.length === length && value.every((item) => Number.isFinite(item) && (!positive || item > 0));
}

export function validateThreeDManifest(manifest) {
  const errors = [];
  if (!manifest || typeof manifest !== "object") return { valid: false, errors: ["ThreeDManifest ausente."] };
  if (manifest.schemaVersion !== 1) errors.push("schemaVersion no soportado.");
  if (!Number.isInteger(manifest.revision) || manifest.revision < 1) errors.push("revision inválida.");
  if (typeof manifest.modelId !== "string" || !manifest.modelId) errors.push("modelId inválido.");
  if (!manifest.asset || !/^\/models\/[a-z0-9-]+\.glb$/.test(manifest.asset.url || "") || !["development", "production"].includes(manifest.asset.kind)) errors.push("asset registrado inválido.");
  if (!Array.isArray(manifest.bindings) || manifest.bindings.length === 0) errors.push("bindings debe contener al menos un binding.");
  else {
    const bindingTargets = new Set();
    manifest.bindings.forEach((binding, index) => {
    const prefix = `binding ${index}`;
    if (!binding?.sourceViewId || !binding.meshName || !binding.materialName) errors.push(`${prefix}: ids incompletos.`);
    const target = `${binding?.meshName}:${binding?.materialName}`;
    if (bindingTargets.has(target)) errors.push(`${prefix}: target duplicado.`);
    bindingTargets.add(target);
    const texture = binding?.texture;
    if (!texture || !COLOR_SPACES.has(texture.colorSpace) || !/^#[0-9a-f]{6}$/i.test(texture.backgroundColor || "") || typeof texture.flipY !== "boolean" || !WRAPS.has(texture.wrapS) || !WRAPS.has(texture.wrapT) || !vector(texture.offset, 2) || !vector(texture.repeat, 2, { positive: true }) || !Number.isFinite(texture.rotation)) errors.push(`${prefix}: texture inválida.`);
    });
  }
  const camera = manifest.camera;
  if (!camera || !Number.isFinite(camera.fov) || camera.fov <= 10 || camera.fov >= 100 || !vector(camera.direction, 3) || !vector(camera.targetOffset, 3) || !Number.isFinite(camera.fitPadding) || camera.fitPadding < 1) errors.push("camera inválida.");
  const orbit = manifest.orbit;
  if (!orbit || typeof orbit.enableRotate !== "boolean" || typeof orbit.enableZoom !== "boolean" || typeof orbit.enablePan !== "boolean" || !Number.isFinite(orbit.minDistanceFactor) || !Number.isFinite(orbit.maxDistanceFactor) || orbit.minDistanceFactor <= 0 || orbit.maxDistanceFactor <= orbit.minDistanceFactor || !Number.isFinite(orbit.minPolarAngle) || !Number.isFinite(orbit.maxPolarAngle) || orbit.maxPolarAngle <= orbit.minPolarAngle || !Number.isFinite(orbit.damping) || orbit.damping < 0) errors.push("orbit inválido.");
  if (!manifest.background || typeof manifest.background.color !== "string" || !Number.isFinite(manifest.background.alpha) || manifest.background.alpha < 0 || manifest.background.alpha > 1) errors.push("background inválido.");
  if (!LIGHTING_PRESETS.has(manifest.lighting?.preset)) errors.push("lighting preset inválido.");
  return { valid: errors.length === 0, errors };
}

export function validateThreeDManifestForTemplate(manifest, template) {
  const result = validateThreeDManifest(manifest);
  const errors = [...result.errors];
  const viewIds = new Set(template?.views?.map((view) => view.id) || []);
  manifest?.bindings?.forEach((binding) => {
    if (!viewIds.has(binding.sourceViewId)) errors.push(`sourceViewId no existe: ${binding.sourceViewId}.`);
  });
  return { valid: errors.length === 0, errors };
}

export function getThreeDManifest(modelId) {
  const manifest = THREE_MODEL_MANIFESTS[modelId] ?? null;
  if (!manifest) return null;
  const validation = validateThreeDManifest(manifest);
  if (!validation.valid) throw new Error(`ThreeDManifest inválido: ${validation.errors.join(" ")}`);
  return manifest;
}

export function getThreeDManifestForTemplate(template) {
  const modelId = template?.threeD?.modelId;
  const manifest = modelId ? getThreeDManifest(modelId) : null;
  if (!manifest) return null;
  const validation = validateThreeDManifestForTemplate(manifest, template);
  return validation.valid ? manifest : null;
}

export function isThreeDModeAvailable(template) {
  return Boolean(getThreeDManifestForTemplate(template));
}

export function getThreeSourceViewIds(manifest) {
  return [...new Set((manifest?.bindings || []).map((binding) => binding.sourceViewId))];
}

