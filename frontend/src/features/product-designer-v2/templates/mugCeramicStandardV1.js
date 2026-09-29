import { PRODUCT_TEMPLATE_IDS } from "./templateCatalog.js";

export const MUG_WRAP_PRINT_SURFACE = Object.freeze({
  schemaVersion: 1,
  id: "wrap-main",
  label: "Superficie imprimible envolvente",
  coordinateSystem: "normalized-0-1",
  aspectRatio: 2.1,
  previewTextureResolution: { width: 1008, height: 480 },
  safeArea: null,
  bleed: null,
  physicalSize: null,
  restrictedZones: [],
  orientation: { topology: "wrap", horizontal: "left-to-right", vertical: "top-to-bottom", front: "center", seam: "horizontal-edges" },
  constraints: {
    allowedElementTypes: ["text", "image", "shape"],
    minScale: null,
    maxScale: null,
    rotation: { mode: "free", min: null, max: null },
  },
});

export const MUG_CERAMIC_STANDARD_V1_TEMPLATE = Object.freeze({
  schemaVersion: 1,
  templateId: PRODUCT_TEMPLATE_IDS.MUG_CERAMIC_STANDARD_V1,
  templateRevision: 1,
  productType: "mug",
  label: "Taza cerámica personalizada",
  printSurfaces: [MUG_WRAP_PRINT_SURFACE],
  editor: {
    coordinateSystem: "normalized-print-area",
    background: "neutral-grid",
    geometryPurpose: "editor-only",
  },
  views: [
    {
      id: "wrap",
      label: "Diseño envolvente",
      printSurfaceId: MUG_WRAP_PRINT_SURFACE.id,
      surface: { label: "Vista editorial 2D · sin escala de producción", tone: "light" },
    },
  ],
  mockups: ["mug-white-basic-v1"],
  threeD: { profileId: "mug-11oz-v1" },
});
