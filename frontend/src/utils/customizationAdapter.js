export function isDesignerCustomization(customization) {
  return customization?.type === "designer";
}

export function normalizeCustomization(customization, product = null) {
  if (!customization || !isDesignerCustomization(customization)) return customization ?? null;

  const designVersion =
    customization.designVersion === 2 || customization.designVersion === 1
      ? customization.designVersion
      : 1;

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

export function createDesignerCustomizationPayload({
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
