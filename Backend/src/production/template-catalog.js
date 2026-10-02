const surface = (viewId, surfaceId, label, widthPx, heightPx) =>
  Object.freeze({ viewId, surfaceId, label, filename: `${viewId}.png`, widthPx, heightPx });

export const PRODUCTION_TEMPLATES = Object.freeze({
  "mug-ceramic-standard-v1": Object.freeze({
    templateId: "mug-ceramic-standard-v1",
    templateRevision: 1,
    primaryViewId: "wrap",
    surfaces: Object.freeze([
      surface("wrap", "wrap-main", "Diseño envolvente", 1008, 480),
    ]),
  }),
  "tshirt-basic-v1": Object.freeze({
    templateId: "tshirt-basic-v1",
    templateRevision: 2,
    primaryViewId: "front",
    surfaces: Object.freeze([
      surface("front", "tshirt-front", "Frontal", 754, 1024),
      surface("back", "tshirt-back", "Trasera", 747, 1024),
      surface("sleeve-left", "tshirt-sleeve-left", "Manga izquierda", 1024, 525),
      surface("sleeve-right", "tshirt-sleeve-right", "Manga derecha", 1024, 525),
    ]),
  }),
});

export function getProductionTemplate(templateId) {
  return PRODUCTION_TEMPLATES[templateId] || null;
}
