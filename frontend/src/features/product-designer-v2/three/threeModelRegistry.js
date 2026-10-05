import { VARIANT_COLOR_PRESENTATIONS } from "../domain/variantColors.js";
import { TSHIRT_SURFACE_CALIBRATION } from "../domain/tshirtSurfaceCalibration.js";

const COLOR_SPACES = new Set(["srgb", "linear"]);
const WRAPS = new Set(["clamp", "repeat", "mirror"]);
const LIGHTING_PRESETS = new Set(["studio-soft"]);
const MODEL_STATUSES = new Set(["development", "verified", "production"]);
const TEXTURE_COMPOSITIONS = new Set(["opaque-base", "transparent-overlay"]);

export const THREE_MODEL_ASSETS = Object.freeze({
  "mug-development-v1": Object.freeze({ modelId: "mug-development-v1", url: "/models/mug-development-v1.glb", status: "development", origin: "generated-in-project" }),
  "mug-11oz-v1": Object.freeze({ modelId: "mug-11oz-v1", url: "/models/mug-11oz-v1.glb", status: "development", origin: "licensed-source" }),
  "tshirt-web-v1": Object.freeze({ modelId: "tshirt-web-v1", url: "/models/tshirt-web.glb", status: "development", origin: "prepared-spec-020g" }),
});

const tshirtMaterialVariant = (id, color) => Object.freeze({
  id,
  materials: Object.freeze([
    Object.freeze({ materialName: "TShirtFabric", color, roughness: 0.82, metalness: 0 }),
    Object.freeze({ materialName: "TShirtFrontPrintable", color, roughness: 0.82, metalness: 0 }),
    Object.freeze({ materialName: "TShirtBackPrintable", color, roughness: 0.82, metalness: 0 }),
  ]),
});

function atlasRegion(printSurfaceId, calibratedRegion) {
  return Object.freeze({ printSurfaceId, regionId: calibratedRegion.id, editorRect: calibratedRegion.editorRect, editorPolygon: calibratedRegion.editorPolygon, uvMapping: calibratedRegion.uvMapping });
}

const panelRegion = (id) => TSHIRT_SURFACE_CALIBRATION[id].regions[0];
const panelSurface = (printSurfaceId, meshName, materialName, calibratedRegion) => Object.freeze({
  printSurfaceId,
  binding: Object.freeze({ meshName, materialName }),
  uvMapping: Object.freeze({ ...calibratedRegion.uvMapping, seamU: calibratedRegion.uvMapping.uMin, frontU: (calibratedRegion.uvMapping.uMin + calibratedRegion.uvMapping.uMax) / 2, rotation: 0 }),
  texture: Object.freeze({ colorSpace: "srgb", backgroundColor: "#ffffff", wrapS: "clamp", wrapT: "clamp", composition: "transparent-overlay" }),
});

const overlayBinding = (meshName, materialName, panelId, printSurfaceId) => Object.freeze({
  meshName,
  materialName,
  geometryRegionId: panelId,
  regions: Object.freeze([atlasRegion(printSurfaceId, panelRegion(panelId))]),
});

export const PRODUCT_3D_PROFILES = Object.freeze({
  "tshirt-basic-v1": Object.freeze({
    schemaVersion: 1,
    revision: 2,
    profileId: "tshirt-basic-v1",
    modelId: "tshirt-web-v1",
    modelStatus: "development",
    dimensions: null,
    referenceData: Object.freeze({ images: Object.freeze([]), verifiedDimensions: null, provenance: Object.freeze({ type: "prepared-spec-020g", reference: "SPEC-020G external mug/tshirt workspace · development-only public asset" }) }),
    printableSurfaces: Object.freeze([
      panelSurface("tshirt-front", "TShirtWebMesh_1", "TShirtFrontPrintable", panelRegion("front")),
      panelSurface("tshirt-back", "TShirtWebMesh_2", "TShirtBackPrintable", panelRegion("back")),
      panelSurface("tshirt-sleeve-left", "TShirtWebMesh", "TShirtFabric", panelRegion("sleeve-left")),
      panelSurface("tshirt-sleeve-right", "TShirtWebMesh", "TShirtFabric", panelRegion("sleeve-right")),
    ]),
    garmentMaterials: Object.freeze(["TShirtFabric", "TShirtFrontPrintable", "TShirtBackPrintable"]),
    artworkComposition: Object.freeze({
      mode: "transparent-overlay",
      atlasSize: TSHIRT_SURFACE_CALIBRATION.atlasSize,
      geometryClassifierId: "tshirt-web-v1",
      bindings: Object.freeze([
        overlayBinding("TShirtWebMesh_1", "TShirtFrontPrintable", "front", "tshirt-front"),
        overlayBinding("TShirtWebMesh", "TShirtFabric", "front", "tshirt-front"),
        overlayBinding("TShirtWebMesh_2", "TShirtBackPrintable", "back", "tshirt-back"),
        overlayBinding("TShirtWebMesh", "TShirtFabric", "back", "tshirt-back"),
        overlayBinding("TShirtWebMesh", "TShirtFabric", "sleeve-left", "tshirt-sleeve-left"),
        overlayBinding("TShirtWebMesh", "TShirtFabric", "sleeve-right", "tshirt-sleeve-right"),
      ]),
    }),
    materialVariants: Object.freeze({
      defaultVariantId: "white",
      variantMappings: Object.freeze(VARIANT_COLOR_PRESENTATIONS.map((color) => Object.freeze({ productVariantId: color.id, materialVariantId: color.id }))),
      variants: Object.freeze(VARIANT_COLOR_PRESENTATIONS.map((color) => tshirtMaterialVariant(color.id, color.baseColor))),
    }),
    camera: Object.freeze({ fov: 32, direction: Object.freeze([0, 0.04, 1]), targetOffset: Object.freeze([0, 0, 0]), fitPadding: 1.2 }),
    orbit: Object.freeze({ enableRotate: true, enableZoom: true, enablePan: false, minDistanceFactor: 0.78, maxDistanceFactor: 1.9, minPolarAngle: 0.69, maxPolarAngle: 2.45, damping: 0.075 }),
    background: Object.freeze({ color: "#f3f4f6", alpha: 1 }),
    lighting: Object.freeze({ preset: "studio-soft" }),
  }),
  "mug-11oz-v1": Object.freeze({
    schemaVersion: 1,
    revision: 1,
    profileId: "mug-11oz-v1",
    modelId: "mug-11oz-v1",
    modelStatus: "development",
    dimensions: null,
    referenceData: Object.freeze({ images: Object.freeze([]), verifiedDimensions: null, provenance: Object.freeze({ type: "licensed-source", reference: "CGTrader 4549774 · frontend/assets-source/3d/mug-11oz/SOURCE.md" }) }),
    printableSurfaces: Object.freeze([
      Object.freeze({
        printSurfaceId: "wrap-main",
        binding: Object.freeze({ meshName: "MugBody", materialName: "PrintableSurface" }),
        uvMapping: Object.freeze({ uMin: 0, uMax: 1, vMin: 0, vMax: 1, seamU: 0, frontU: 0.5, flipU: false, flipV: true, rotation: 0 }),
        texture: Object.freeze({ colorSpace: "srgb", backgroundColor: "#ffffff", wrapS: "clamp", wrapT: "clamp", composition: "opaque-base" }),
      }),
    ]),
    materialVariants: Object.freeze({
      defaultVariantId: "ceramic-white",
      variantMappings: Object.freeze([{ productVariantId: null, materialVariantId: "ceramic-white" }]),
      variants: Object.freeze([Object.freeze({
        id: "ceramic-white",
        materials: Object.freeze([
          Object.freeze({ materialName: "PrintableSurface", color: "#ffffff", roughness: 0.58, metalness: 0 }),
          Object.freeze({ materialName: "CeramicDetail", color: "#ffffff", roughness: 0.5, metalness: 0 }),
        ]),
      })]),
    }),
    camera: Object.freeze({ fov: 32, direction: Object.freeze([0.2, 0.08, 1]), targetOffset: Object.freeze([0, 0, 0]), fitPadding: 1.25 }),
    orbit: Object.freeze({ enableRotate: true, enableZoom: true, enablePan: false, minDistanceFactor: 0.82, maxDistanceFactor: 1.9, minPolarAngle: 0.65, maxPolarAngle: 2.35, damping: 0.075 }),
    background: Object.freeze({ color: "#f3f4f6", alpha: 1 }),
    lighting: Object.freeze({ preset: "studio-soft" }),
  }),
  "mug-ceramic-development-v1": Object.freeze({
    schemaVersion: 1,
    revision: 1,
    profileId: "mug-ceramic-development-v1",
    modelId: "mug-development-v1",
    modelStatus: "development",
    dimensions: null,
    referenceData: Object.freeze({ images: Object.freeze([]), verifiedDimensions: null, provenance: Object.freeze({ type: "generated-in-project", reference: "frontend/scripts/generate-development-mug-model.mjs" }) }),
    printableSurfaces: Object.freeze([
      Object.freeze({
        printSurfaceId: "wrap-main",
        binding: Object.freeze({ meshName: "MugBody", materialName: "PrintableSurface" }),
        uvMapping: Object.freeze({ uMin: 0, uMax: 1, vMin: 0, vMax: 1, seamU: 0, frontU: 0.5, flipU: false, flipV: true, rotation: 0 }),
        texture: Object.freeze({ colorSpace: "srgb", backgroundColor: "#ffffff", wrapS: "clamp", wrapT: "clamp", composition: "opaque-base" }),
      }),
    ]),
    materialVariants: Object.freeze({
      defaultVariantId: "ceramic-white",
      variantMappings: Object.freeze([{ productVariantId: null, materialVariantId: "ceramic-white" }]),
      variants: Object.freeze([Object.freeze({
        id: "ceramic-white",
        materials: Object.freeze([
          Object.freeze({ materialName: "PrintableSurface", color: "#ffffff", roughness: 0.58, metalness: 0 }),
          Object.freeze({ materialName: "CeramicDetail", color: "#ffffff", roughness: 0.5, metalness: 0 }),
        ]),
      })]),
    }),
    camera: Object.freeze({ fov: 32, direction: Object.freeze([0.28, 0.12, 1]), targetOffset: Object.freeze([0, 0.03, 0]), fitPadding: 1.28 }),
    orbit: Object.freeze({ enableRotate: true, enableZoom: true, enablePan: false, minDistanceFactor: 0.82, maxDistanceFactor: 1.9, minPolarAngle: 0.65, maxPolarAngle: 2.35, damping: 0.075 }),
    background: Object.freeze({ color: "#f3f4f6", alpha: 1 }),
    lighting: Object.freeze({ preset: "studio-soft" }),
  }),
});

function vector(value, length, { positive = false } = {}) {
  return Array.isArray(value) && value.length === length && value.every((item) => Number.isFinite(item) && (!positive || item > 0));
}

function validateDimensions(dimensions) {
  return dimensions === null || (dimensions && ["width", "height", "depth"].every((key) => Number.isFinite(dimensions[key]) && dimensions[key] > 0) && ["mm", "cm", "in"].includes(dimensions.unit));
}

function validateMaterialVariants(materialVariants) {
  if (!materialVariants || !materialVariants.defaultVariantId || !Array.isArray(materialVariants.variants) || !Array.isArray(materialVariants.variantMappings)) return false;
  const ids = new Set(materialVariants.variants.map((variant) => variant.id));
  if (!ids.has(materialVariants.defaultVariantId) || materialVariants.variantMappings.some((mapping) => !ids.has(mapping.materialVariantId))) return false;
  return materialVariants.variants.every((variant) => variant.id && Array.isArray(variant.materials) && variant.materials.length > 0 && variant.materials.every((material) => material.materialName && /^#[0-9a-f]{6}$/i.test(material.color) && Number.isFinite(material.roughness) && material.roughness >= 0 && material.roughness <= 1 && Number.isFinite(material.metalness) && material.metalness >= 0 && material.metalness <= 1));
}

export function validateProduct3DProfile(profile) {
  const errors = [];
  if (!profile || typeof profile !== "object") return { valid: false, errors: ["Product3DProfile ausente."] };
  if (profile.schemaVersion !== 1) errors.push("schemaVersion de Product3DProfile no soportado.");
  if (!Number.isInteger(profile.revision) || profile.revision < 1) errors.push("revision inválida.");
  if (typeof profile.profileId !== "string" || !profile.profileId) errors.push("profileId inválido.");
  if (typeof profile.modelId !== "string" || !THREE_MODEL_ASSETS[profile.modelId]) errors.push("modelId no registrado.");
  if (!MODEL_STATUSES.has(profile.modelStatus) || THREE_MODEL_ASSETS[profile.modelId]?.status !== profile.modelStatus) errors.push("modelStatus inválido o inconsistente.");
  if (!validateDimensions(profile.dimensions)) errors.push("dimensions inválidas.");
  if (!profile.referenceData || !Array.isArray(profile.referenceData.images) || !(profile.referenceData.verifiedDimensions === null || validateDimensions(profile.referenceData.verifiedDimensions)) || !profile.referenceData.provenance?.type) errors.push("referenceData inválida.");
  if (!Array.isArray(profile.printableSurfaces) || profile.printableSurfaces.length === 0) errors.push("printableSurfaces debe contener al menos una superficie.");
  else {
    const bindingTargets = new Set();
    const surfaceIds = new Set();
    profile.printableSurfaces.forEach((surface, index) => {
      const prefix = `printableSurface ${index}`;
      if (!surface?.printSurfaceId || !surface.binding?.meshName || !surface.binding?.materialName) errors.push(`${prefix}: ids o binding incompletos.`);
      if (surfaceIds.has(surface?.printSurfaceId)) errors.push(`${prefix}: printSurfaceId duplicado.`);
      surfaceIds.add(surface?.printSurfaceId);
      const target = `${surface?.binding?.meshName}:${surface?.binding?.materialName}`;
      if (!profile.artworkComposition && bindingTargets.has(target)) errors.push(`${prefix}: target duplicado.`);
      bindingTargets.add(target);
      const uv = surface?.uvMapping;
      if (!uv || !["uMin", "uMax", "vMin", "vMax", "seamU", "frontU", "rotation"].every((key) => Number.isFinite(uv[key])) || uv.uMax <= uv.uMin || uv.vMax <= uv.vMin || uv.seamU < uv.uMin || uv.seamU > uv.uMax || uv.frontU < uv.uMin || uv.frontU > uv.uMax || typeof uv.flipU !== "boolean" || typeof uv.flipV !== "boolean" || (uv.offset !== undefined && !vector(uv.offset, 2)) || (uv.repeat !== undefined && !vector(uv.repeat, 2, { positive: true })) || ((uv.offset !== undefined || uv.repeat !== undefined) && !uv.transformJustification?.trim())) errors.push(`${prefix}: uvMapping inválido.`);
      const texture = surface?.texture;
      if (!texture || !COLOR_SPACES.has(texture.colorSpace) || !/^#[0-9a-f]{6}$/i.test(texture.backgroundColor || "") || !WRAPS.has(texture.wrapS) || !WRAPS.has(texture.wrapT) || (texture.composition !== undefined && !TEXTURE_COMPOSITIONS.has(texture.composition))) errors.push(`${prefix}: texture inválida.`);
    });
  }
  if (profile.artworkComposition !== undefined) {
    const composition = profile.artworkComposition;
    if (composition?.mode !== "transparent-overlay" || !Number.isInteger(composition.atlasSize) || composition.atlasSize <= 0 || !Array.isArray(composition.bindings) || composition.bindings.length === 0) errors.push("artworkComposition inválida.");
    else if (composition.bindings.some((binding) => !binding.meshName || !binding.materialName || (composition.geometryClassifierId && !binding.geometryRegionId) || !Array.isArray(binding.regions) || binding.regions.length === 0 || binding.regions.some((region) => !region.printSurfaceId || !region.regionId || !region.editorRect || !region.uvMapping))) errors.push("artworkComposition contiene bindings inválidos.");
    if (!Array.isArray(profile.garmentMaterials) || profile.garmentMaterials.length === 0 || profile.garmentMaterials.some((name) => typeof name !== "string" || !name)) errors.push("garmentMaterials inválido.");
    else if (profile.materialVariants?.variants.some((variant) => profile.garmentMaterials.some((name) => !variant.materials.some((material) => material.materialName === name)))) errors.push("materialVariants no cubre garmentMaterials.");
  }
  if (!validateMaterialVariants(profile.materialVariants)) errors.push("materialVariants inválido.");
  const camera = profile.camera;
  if (!camera || !Number.isFinite(camera.fov) || camera.fov <= 10 || camera.fov >= 100 || !vector(camera.direction, 3) || !vector(camera.targetOffset, 3) || !Number.isFinite(camera.fitPadding) || camera.fitPadding < 1) errors.push("camera inválida.");
  const orbit = profile.orbit;
  if (!orbit || typeof orbit.enableRotate !== "boolean" || typeof orbit.enableZoom !== "boolean" || typeof orbit.enablePan !== "boolean" || !Number.isFinite(orbit.minDistanceFactor) || !Number.isFinite(orbit.maxDistanceFactor) || orbit.minDistanceFactor <= 0 || orbit.maxDistanceFactor <= orbit.minDistanceFactor || !Number.isFinite(orbit.minPolarAngle) || !Number.isFinite(orbit.maxPolarAngle) || orbit.maxPolarAngle <= orbit.minPolarAngle || !Number.isFinite(orbit.damping) || orbit.damping < 0) errors.push("orbit inválido.");
  if (!profile.background || typeof profile.background.color !== "string" || !Number.isFinite(profile.background.alpha) || profile.background.alpha < 0 || profile.background.alpha > 1) errors.push("background inválido.");
  if (!LIGHTING_PRESETS.has(profile.lighting?.preset)) errors.push("lighting preset inválido.");
  return { valid: errors.length === 0, errors };
}

export function validateProduct3DProfileForTemplate(profile, template) {
  const errors = [...validateProduct3DProfile(profile).errors];
  const surfaces = new Map(template?.printSurfaces?.map((surface) => [surface.id, surface]) || []);
  const profileSurfaces = new Map(profile?.printableSurfaces?.map((surface) => [surface.printSurfaceId, surface]) || []);
  if (surfaces.size === 0) errors.push("ProductTemplate no tiene PrintSurface para el perfil 3D.");
  surfaces.forEach((printSurface, surfaceId) => {
    const profileSurface = profileSurfaces.get(surfaceId);
    if (!profileSurface) {
      errors.push(`Product3DProfile no soporta PrintSurface: ${surfaceId}.`);
      return;
    }
    const uv = profileSurface.uvMapping;
    const expectedFront = uv.flipU ? uv.uMax - 0.5 * (uv.uMax - uv.uMin) : uv.uMin + 0.5 * (uv.uMax - uv.uMin);
    if (printSurface.orientation.front === "center" && Math.abs(uv.frontU - expectedFront) > 1e-10) errors.push(`frontU no coincide con el centro de ${printSurface.id}.`);
    if (printSurface.orientation.seam === "horizontal-edges" && uv.seamU !== uv.uMin && uv.seamU !== uv.uMax) errors.push(`seamU no coincide con un borde de ${printSurface.id}.`);
    if ((printSurface.orientation.horizontal === "left-to-right") === uv.flipU) errors.push(`flipU contradice la dirección de lectura de ${printSurface.id}.`);
    if ((printSurface.orientation.vertical === "top-to-bottom") !== uv.flipV) errors.push(`flipV contradice la orientación vertical de ${printSurface.id}.`);
  });
  return { valid: errors.length === 0, errors };
}

export function getProduct3DProfile(profileId) {
  const profile = PRODUCT_3D_PROFILES[profileId] ?? null;
  if (!profile) return null;
  const validation = validateProduct3DProfile(profile);
  if (!validation.valid) throw new Error(`Product3DProfile inválido: ${validation.errors.join(" ")}`);
  return profile;
}

export function getProduct3DProfileForTemplate(template) {
  const profile = template?.threeD?.profileId ? getProduct3DProfile(template.threeD.profileId) : null;
  if (!profile) return null;
  return validateProduct3DProfileForTemplate(profile, template).valid ? profile : null;
}

export function getThreeModelAsset(modelId) {
  return THREE_MODEL_ASSETS[modelId] ?? null;
}

export function isThreeDModeAvailable(template) {
  return Boolean(getProduct3DProfileForTemplate(template));
}

export function getProduct3DSurfaceIds(profile) {
  return [...new Set((profile?.printableSurfaces || []).map((surface) => surface.printSurfaceId))];
}

export function getRenderable3DSurfaceIds(profile, template) {
  const selected = new Set(template?.printSurfaces?.map((surface) => surface.id) || []);
  return getProduct3DSurfaceIds(profile).filter((id) => selected.has(id));
}

export function getMaterialVariant(profile, productVariant = null) {
  const materialVariants = profile?.materialVariants;
  if (!materialVariants) return null;
  const productVariantId = productVariant?.colorId || productVariant?.variantId || null;
  const mapping = materialVariants.variantMappings.find((candidate) => candidate.productVariantId === productVariantId)
    || materialVariants.variantMappings.find((candidate) => candidate.productVariantId === null);
  const materialVariantId = mapping?.materialVariantId || materialVariants.defaultVariantId;
  return materialVariants.variants.find((variant) => variant.id === materialVariantId) ?? null;
}
