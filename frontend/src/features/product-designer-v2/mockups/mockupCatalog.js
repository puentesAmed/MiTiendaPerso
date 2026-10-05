export const MOCKUP_DEFINITIONS = Object.freeze({
  "mug-white-basic-v1": Object.freeze({ mockupId: "mug-white-basic-v1", sourceViewId: "wrap", manifestRevision: 1, previewWidth: 1200, label: "Preview básico de taza", kind: "development" }),
});

export function getMockupDefinition(template) {
  const mockupId = template?.mockups?.[0];
  return mockupId ? MOCKUP_DEFINITIONS[mockupId] ?? null : null;
}

export function isMockupModeAvailable(template) {
  const definition = getMockupDefinition(template);
  return Boolean(definition?.kind === "product-preview" && template?.views?.some((view) => view.id === definition.sourceViewId));
}

export function getAvailableDesignerModes({ has2DPreview, has3DProfile }) {
  return ["design", ...(has2DPreview ? ["mockup"] : []), ...(has3DProfile ? ["three-d"] : [])];
}

