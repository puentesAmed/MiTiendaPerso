import { getViewPrintSurface } from "../contracts/printSurface.js";

export const PLACEMENT_COORDINATE_SYSTEM = "normalized";

export function normalizedPointToSurfacePixels(point, surfaceSize) {
  if (!surfaceSize || surfaceSize.width <= 0 || surfaceSize.height <= 0) {
    throw new Error("La superficie necesita dimensiones positivas.");
  }
  return {
    x: point.x * surfaceSize.width,
    y: point.y * surfaceSize.height,
  };
}

export function normalizedElementToSurfacePixels(element, surfaceSize) {
  const origin = normalizedPointToSurfacePixels(element, surfaceSize);
  const width = element.width * surfaceSize.width;
  const height = element.height * surfaceSize.height;
  return {
    x: origin.x,
    y: origin.y,
    width,
    height,
    centerX: origin.x + width / 2,
    centerY: origin.y + height / 2,
    rotation: element.rotation,
  };
}

export function getPlacementAlignment(template, view) {
  const printSurface = getViewPrintSurface(template, view);
  if (!printSurface) throw new Error(`La vista ${view?.id || "desconocida"} no tiene PrintSurface.`);
  return Object.freeze({
    coordinateSystem: PLACEMENT_COORDINATE_SYSTEM,
    viewId: view.id,
    surfaceId: printSurface.id,
    logicalSize: Object.freeze({ ...printSurface.previewTextureResolution }),
    orientation: Object.freeze({ ...printSurface.orientation }),
    physicalSize: printSurface.physicalSize ?? null,
    safeArea: printSurface.safeArea ?? null,
    bleed: printSurface.bleed ?? null,
  });
}
