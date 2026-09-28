const createPrintArea = (id, label, geometry) => ({
  id,
  label,
  ...geometry,
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

export const GENERIC_FLAT_DEMO_TEMPLATE = Object.freeze({
  schemaVersion: 1,
  templateId: "generic-flat-demo",
  templateRevision: 1,
  productType: "development-fixture",
  label: "Superficie plana de demostración",
  developmentOnly: true,
  editor: {
    coordinateSystem: "normalized-print-area",
    background: "neutral-grid",
  },
  views: [
    {
      id: "primary",
      label: "Vista principal",
      canvas: { aspectRatio: 1.2 },
      surface: { label: "Fixture A", tone: "light" },
      printAreas: [createPrintArea("primary-area", "Área de diseño", { x: 0.18, y: 0.16, width: 0.64, height: 0.68 })],
    },
    {
      id: "secondary",
      label: "Vista secundaria",
      canvas: { aspectRatio: 1.2 },
      surface: { label: "Fixture B", tone: "muted" },
      printAreas: [createPrintArea("secondary-area", "Área secundaria", { x: 0.24, y: 0.22, width: 0.52, height: 0.56 })],
    },
  ],
  mockups: [],
  threeD: null,
});
