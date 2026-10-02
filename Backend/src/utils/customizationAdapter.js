export function isDesignerCustomization(customization) {
  return customization?.type === "designer";
}

export function getCustomizationDesignVersion(customization) {
  if (!isDesignerCustomization(customization)) return null;
  return customization.schemaVersion === 2 || customization.designVersion === 2 ? 2 : 1;
}

export function normalizeCustomizationPayload(customization) {
  if (!isDesignerCustomization(customization)) return null;

  const design = customization.design || null;
  const previewsBySide = customization.previewsBySide || design?.previewsBySide || null;
  const previewImage =
    customization.previewImage || previewsBySide?.front || previewsBySide?.back || null;

  return {
    ...customization,
    type: "designer",
    designVersion: getCustomizationDesignVersion(customization),
    design,
    previewsBySide,
    previewImage,
    schemaVersion: customization.schemaVersion === 2 ? 2 : 1,
    designDocument: customization.schemaVersion === 2 ? customization.designDocument || null : null,
    uploads: customization.schemaVersion === 2 ? customization.uploads || null : null,
  };
}
