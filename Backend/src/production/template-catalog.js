const surface = (viewId, surfaceId, label, widthPx, heightPx, orientation) =>
  Object.freeze({ viewId, surfaceId, label, filename: `${viewId}.png`, widthPx, heightPx, physicalSize: null, safeArea: null, bleed: null, orientation: Object.freeze(orientation) });

const flatOrientation = (horizontal = "left-to-right") => ({ topology: "panel", horizontal, vertical: "top-to-bottom", front: "center", seam: null });

export const PRODUCTION_TEMPLATES = Object.freeze({
  "mug-ceramic-standard-v1": Object.freeze({
    templateId: "mug-ceramic-standard-v1",
    templateRevision: 1,
    primaryViewId: "wrap",
    surfaces: Object.freeze([
      surface("wrap", "wrap-main", "Diseño envolvente", 1008, 480, { topology: "wrap", horizontal: "left-to-right", vertical: "top-to-bottom", front: "center", seam: "horizontal-edges" }),
    ]),
  }),
  "tshirt-basic-v1": Object.freeze({
    templateId: "tshirt-basic-v1",
    templateRevision: 2,
    primaryViewId: "front",
    surfaces: Object.freeze([
      surface("front", "tshirt-front", "Frontal", 754, 1024, flatOrientation()),
      surface("back", "tshirt-back", "Trasera", 747, 1024, flatOrientation("right-to-left")),
      surface("sleeve-left", "tshirt-sleeve-left", "Manga izquierda", 1024, 525, flatOrientation()),
      surface("sleeve-right", "tshirt-sleeve-right", "Manga derecha", 1024, 525, flatOrientation("right-to-left")),
    ]),
  }),
});

export function getProductionTemplate(templateId) {
  return PRODUCTION_TEMPLATES[templateId] || null;
}
