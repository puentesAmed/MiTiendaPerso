import { DESIGN_ELEMENT_TYPES } from "./elementModel.js";

export const PRINT_SURFACE_SCHEMA_VERSION = 1;

const COORDINATE_SYSTEMS = new Set(["normalized-0-1"]);
const TOPOLOGIES = new Set(["flat", "wrap", "panel"]);
const HORIZONTAL_DIRECTIONS = new Set(["left-to-right", "right-to-left"]);
const VERTICAL_DIRECTIONS = new Set(["top-to-bottom", "bottom-to-top"]);

function normalizedRect(value) {
  return value && ["x", "y", "width", "height"].every((key) => Number.isFinite(value[key]))
    && value.x >= 0 && value.y >= 0 && value.width > 0 && value.height > 0
    && value.x + value.width <= 1 && value.y + value.height <= 1;
}

export function validatePrintSurface(surface) {
  const errors = [];
  if (!surface || typeof surface !== "object") return { valid: false, errors: ["PrintSurface ausente."] };
  if (surface.schemaVersion !== PRINT_SURFACE_SCHEMA_VERSION) errors.push("schemaVersion de PrintSurface no soportado.");
  if (!surface.id) errors.push("PrintSurface necesita id.");
  if (!surface.label) errors.push("PrintSurface necesita label.");
  if (!COORDINATE_SYSTEMS.has(surface.coordinateSystem)) errors.push("coordinateSystem de PrintSurface inválido.");
  if (!Number.isFinite(surface.aspectRatio) || surface.aspectRatio <= 0) errors.push("aspectRatio de PrintSurface inválido.");
  if (surface.physicalSize !== null) {
    const size = surface.physicalSize;
    if (!size || !Number.isFinite(size.width) || size.width <= 0 || !Number.isFinite(size.height) || size.height <= 0 || !["mm", "cm", "in"].includes(size.unit)) errors.push("physicalSize de PrintSurface inválido.");
  }
  const resolution = surface.previewTextureResolution;
  if (!resolution || !Number.isInteger(resolution.width) || resolution.width <= 0 || !Number.isInteger(resolution.height) || resolution.height <= 0) errors.push("previewTextureResolution inválida.");
  else if (Number.isFinite(surface.aspectRatio) && Math.abs((resolution.width / resolution.height) - surface.aspectRatio) > 0.001) errors.push("previewTextureResolution no respeta aspectRatio.");
  if (surface.safeArea !== null && !normalizedRect(surface.safeArea)) errors.push("safeArea de PrintSurface inválida.");
  if (surface.bleed !== null && (!surface.bleed || !["top", "right", "bottom", "left"].every((key) => Number.isFinite(surface.bleed[key]) && surface.bleed[key] >= 0))) errors.push("bleed de PrintSurface inválido.");
  if (!Array.isArray(surface.restrictedZones) || surface.restrictedZones.some((zone) => !normalizedRect(zone))) errors.push("restrictedZones de PrintSurface inválido.");
  const orientation = surface.orientation;
  if (!orientation || !TOPOLOGIES.has(orientation.topology) || !HORIZONTAL_DIRECTIONS.has(orientation.horizontal) || !VERTICAL_DIRECTIONS.has(orientation.vertical) || !["center", null].includes(orientation.front) || !["horizontal-edges", null].includes(orientation.seam)) errors.push("orientation de PrintSurface inválida.");
  if (!surface.constraints || !Array.isArray(surface.constraints.allowedElementTypes) || surface.constraints.allowedElementTypes.some((type) => !DESIGN_ELEMENT_TYPES.includes(type))) errors.push("constraints.allowedElementTypes de PrintSurface inválido.");
  return { valid: errors.length === 0, errors };
}

export function getPrintSurface(template, printSurfaceId) {
  return template?.printSurfaces?.find((surface) => surface.id === printSurfaceId) ?? null;
}

export function getViewPrintSurface(template, view) {
  return view?.printSurfaceId ? getPrintSurface(template, view.printSurfaceId) : null;
}

export function getViewAspectRatio(template, view) {
  return getViewPrintSurface(template, view)?.aspectRatio ?? view?.canvas?.aspectRatio ?? 1;
}

export function getViewPrintAreas(template, view) {
  const surface = getViewPrintSurface(template, view);
  if (!surface) return view?.printAreas ?? [];
  return [{
    id: surface.id,
    label: surface.label,
    x: 0,
    y: 0,
    width: 1,
    height: 1,
    shape: { type: "rect" },
    clip: { enabled: true, type: "shape" },
    safeArea: surface.safeArea,
    bleed: surface.bleed,
    physicalSize: surface.physicalSize,
    constraints: surface.constraints,
  }];
}

export function getViewByPrintSurfaceId(template, printSurfaceId) {
  return template?.views?.find((view) => view.printSurfaceId === printSurfaceId) ?? null;
}
