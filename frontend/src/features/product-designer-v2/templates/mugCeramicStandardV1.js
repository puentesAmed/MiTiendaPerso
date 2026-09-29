import { PRODUCT_TEMPLATE_IDS } from "./templateCatalog.js";

const WRAP_PRINT_AREA = Object.freeze({
  id: "wrap-main",
  label: "Área editorial envolvente",
  x: 0.08,
  y: 0.14,
  width: 0.84,
  height: 0.72,
  shape: { type: "rect" },
  clip: { enabled: true, type: "shape" },
  safeArea: null,
  bleed: null,
  physicalSize: null,
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
  editor: {
    coordinateSystem: "normalized-print-area",
    background: "neutral-grid",
    geometryPurpose: "editor-only",
  },
  views: [
    {
      id: "wrap",
      label: "Diseño envolvente",
      canvas: { aspectRatio: 1.8 },
      surface: { label: "Vista editorial 2D · sin escala de producción", tone: "light" },
      printAreas: [WRAP_PRINT_AREA],
    },
  ],
  mockups: ["mug-white-basic-v1"],
  threeD: { modelId: "mug-development-v1" },
});
