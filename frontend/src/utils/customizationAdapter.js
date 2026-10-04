export function isDesignerCustomization(customization) {
  return customization?.type === "designer";
}

export function normalizeCustomization(customization, product = null) {
  if (!customization || !isDesignerCustomization(customization)) return customization ?? null;

  const designVersion =
    customization.schemaVersion === 2
      ? 2
      : customization.designVersion === 2 || customization.designVersion === 1
      ? customization.designVersion
      : 1;

  if (designVersion === 2) {
    return {
      ...customization,
      type: "designer",
      schemaVersion: 2,
      designVersion: 2,
      designDocument: customization.designDocument || null,
      uploads: customization.uploads || null,
      previewImage: customization.previewImage || null,
      productId: customization.productId || product?._id || product?.id || null,
    };
  }

  const design = customization.design || {
    side: "front",
    elementsBySide: { front: [], back: [] },
    notes: "",
  };

  const previewsBySide = customization.previewsBySide || design.previewsBySide || null;
  const previewImage =
    customization.previewImage || previewsBySide?.front || previewsBySide?.back || null;

  return {
    ...customization,
    type: "designer",
    designVersion,
    design,
    previewsBySide,
    previewImage,
    productId: customization.productId || product?._id || product?.id || null,
  };
}

export function createDesignerV2CustomizationPayload({ clientId, designDocument, uploads, productId, productSnapshot, selectedSurfaceIds, customizationPricing }) {
  return normalizeCustomization({
    type: "designer",
    schemaVersion: 2,
    designVersion: 2,
    clientId,
    designDocument,
    uploads,
    previewImage: null,
    productId,
    productSnapshot,
    selectedSurfaceIds: selectedSurfaceIds ?? designDocument?.selectedSurfaceIds,
    customizationPricing: customizationPricing || null,
  }, productSnapshot);
}

export function createDesignerCustomizationPayload({
  clientId,
  design,
  previewsBySide,
  previewImage,
  productId,
  productSnapshot,
  extra = {},
}) {
  return normalizeCustomization(
    {
      type: "designer",
      clientId,
      designVersion: 1,
      design,
      previewsBySide: previewsBySide || design?.previewsBySide || null,
      previewImage,
      productId,
      productSnapshot,
      ...extra,
    },
    productSnapshot
  );
}
