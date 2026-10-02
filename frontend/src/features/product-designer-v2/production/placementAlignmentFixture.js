import { normalizedPointToSurfacePixels } from "./alignmentContract.js";

export const PLACEMENT_ALIGNMENT_MARKERS = Object.freeze([
  Object.freeze({ id: "TOP", x: 0.5, y: 0.08 }),
  Object.freeze({ id: "LEFT", x: 0.08, y: 0.5 }),
  Object.freeze({ id: "CENTER", x: 0.5, y: 0.5 }),
  Object.freeze({ id: "RIGHT", x: 0.92, y: 0.5 }),
  Object.freeze({ id: "BOTTOM", x: 0.5, y: 0.92 }),
]);

export function projectPlacementAlignmentMarkers(surfaceSize) {
  return PLACEMENT_ALIGNMENT_MARKERS.map((marker) => ({
    ...marker,
    ...normalizedPointToSurfacePixels(marker, surfaceSize),
  }));
}
