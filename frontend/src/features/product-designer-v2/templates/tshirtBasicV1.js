import { PRODUCT_TEMPLATE_IDS } from "./templateCatalog.js";
import { TSHIRT_SURFACE_CALIBRATION } from "../domain/tshirtSurfaceCalibration.js";

const PANEL_CONSTRAINTS = Object.freeze({
  allowedElementTypes: Object.freeze(["text", "image", "shape"]),
  minScale: null,
  maxScale: null,
  rotation: Object.freeze({ mode: "free", min: null, max: null }),
});

const FULL_DISPLAY_FIT = Object.freeze({ maxWidthRatio: 1, maxHeightRatio: 1 });
const SLEEVE_DISPLAY_FIT = Object.freeze({ maxWidthRatio: 0.72, maxHeightRatio: 0.72 });

function garmentPresentation(guideId, aspectRatio, calibration, displayFit = FULL_DISPLAY_FIT) {
  return Object.freeze({
    type: "garment",
    guideId,
    aspectRatio,
    displayFit,
    guideBounds: Object.freeze({ x: 0, y: 0, width: 1, height: 1 }),
    printSurface: calibration.editorFrame,
    guide: calibration.guide,
    editableMask: calibration.mask,
    regions: calibration.regions,
  });
}

export const TSHIRT_FRONT_PRINT_SURFACE = Object.freeze({
  schemaVersion: 1,
  id: "tshirt-front",
  label: "Área frontal",
  coordinateSystem: "normalized-0-1",
  aspectRatio: 754 / 1024,
  previewTextureResolution: Object.freeze({ width: 754, height: 1024 }),
  physicalSize: null,
  safeArea: null,
  bleed: null,
  restrictedZones: Object.freeze([]),
  editableMask: TSHIRT_SURFACE_CALIBRATION.front.mask,
  regions: TSHIRT_SURFACE_CALIBRATION.front.regions,
  orientation: Object.freeze({ topology: "panel", horizontal: "left-to-right", vertical: "top-to-bottom", front: "center", seam: null }),
  constraints: PANEL_CONSTRAINTS,
});

export const TSHIRT_BACK_PRINT_SURFACE = Object.freeze({
  schemaVersion: 1,
  id: "tshirt-back",
  label: "Área trasera",
  coordinateSystem: "normalized-0-1",
  aspectRatio: 747 / 1024,
  previewTextureResolution: Object.freeze({ width: 747, height: 1024 }),
  physicalSize: null,
  safeArea: null,
  bleed: null,
  restrictedZones: Object.freeze([]),
  editableMask: TSHIRT_SURFACE_CALIBRATION.back.mask,
  regions: TSHIRT_SURFACE_CALIBRATION.back.regions,
  orientation: Object.freeze({ topology: "panel", horizontal: "right-to-left", vertical: "top-to-bottom", front: "center", seam: null }),
  constraints: PANEL_CONSTRAINTS,
});

function sleevePrintSurface(id, label, calibrationKey) {
  const calibration = TSHIRT_SURFACE_CALIBRATION[calibrationKey];
  return Object.freeze({
    schemaVersion: 1,
    id,
    label,
    coordinateSystem: "normalized-0-1",
    aspectRatio: 1024 / 525,
    previewTextureResolution: Object.freeze({ width: 1024, height: 525 }),
    physicalSize: null,
    safeArea: null,
    bleed: null,
    restrictedZones: Object.freeze([]),
    editableMask: calibration.mask,
    regions: calibration.regions,
    orientation: Object.freeze({ topology: "panel", horizontal: calibrationKey === "sleeve-right" ? "right-to-left" : "left-to-right", vertical: "top-to-bottom", front: "center", seam: null }),
    constraints: PANEL_CONSTRAINTS,
  });
}

export const TSHIRT_LEFT_SLEEVE_PRINT_SURFACE = sleevePrintSurface("tshirt-sleeve-left", "Manga izquierda", "sleeve-left");
export const TSHIRT_RIGHT_SLEEVE_PRINT_SURFACE = sleevePrintSurface("tshirt-sleeve-right", "Manga derecha", "sleeve-right");

export const TSHIRT_BASIC_V1_TEMPLATE = Object.freeze({
  schemaVersion: 1,
  templateId: PRODUCT_TEMPLATE_IDS.TSHIRT_BASIC_V1,
  templateRevision: 2,
  productType: "tshirt",
  label: "Camiseta básica personalizada",
  draftMigration: Object.freeze({ compatibleRevisions: Object.freeze([1]), initializeMissingViews: true }),
  printSurfaces: Object.freeze([TSHIRT_FRONT_PRINT_SURFACE, TSHIRT_BACK_PRINT_SURFACE, TSHIRT_LEFT_SLEEVE_PRINT_SURFACE, TSHIRT_RIGHT_SLEEVE_PRINT_SURFACE]),
  editor: Object.freeze({ coordinateSystem: "normalized-print-area", background: "neutral-grid", geometryPurpose: "editor-only" }),
  views: Object.freeze([
    Object.freeze({ id: "front", label: "Frontal", printSurfaceId: TSHIRT_FRONT_PRINT_SURFACE.id, surface: Object.freeze({ label: "Vista frontal", tone: "light" }), editorPresentation: garmentPresentation("tshirt-web-front", TSHIRT_FRONT_PRINT_SURFACE.aspectRatio, TSHIRT_SURFACE_CALIBRATION.front) }),
    Object.freeze({ id: "back", label: "Trasera", printSurfaceId: TSHIRT_BACK_PRINT_SURFACE.id, surface: Object.freeze({ label: "Vista trasera", tone: "light" }), editorPresentation: garmentPresentation("tshirt-web-back", TSHIRT_BACK_PRINT_SURFACE.aspectRatio, TSHIRT_SURFACE_CALIBRATION.back) }),
    Object.freeze({ id: "sleeve-left", label: "Manga izquierda", printSurfaceId: TSHIRT_LEFT_SLEEVE_PRINT_SURFACE.id, surface: Object.freeze({ label: "Vista de manga izquierda", tone: "light" }), editorPresentation: garmentPresentation("tshirt-web-sleeve-left", TSHIRT_LEFT_SLEEVE_PRINT_SURFACE.aspectRatio, TSHIRT_SURFACE_CALIBRATION["sleeve-left"], SLEEVE_DISPLAY_FIT) }),
    Object.freeze({ id: "sleeve-right", label: "Manga derecha", printSurfaceId: TSHIRT_RIGHT_SLEEVE_PRINT_SURFACE.id, surface: Object.freeze({ label: "Vista de manga derecha", tone: "light" }), editorPresentation: garmentPresentation("tshirt-web-sleeve-right", TSHIRT_RIGHT_SLEEVE_PRINT_SURFACE.aspectRatio, TSHIRT_SURFACE_CALIBRATION["sleeve-right"], SLEEVE_DISPLAY_FIT) }),
  ]),
  mockups: Object.freeze([]),
  threeD: Object.freeze({ profileId: "tshirt-basic-v1" }),
});

