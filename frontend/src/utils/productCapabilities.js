export function isCustomizableProduct(product) {
  return product?.customizable === true;
}

export function hasRequiredProductOptions(product) {
  if (Array.isArray(product?.variants)) return product.variants.length > 0;
  return Boolean(product?.variants?.sizes?.length || product?.variants?.colors?.length);
}

export function canQuickAdd(product, { optionsResolved = false } = {}) {
  return Boolean(
    product
    && product.provider !== "aliexpress"
    && !product.externalId
    && !isCustomizableProduct(product)
    && (!hasRequiredProductOptions(product) || optionsResolved)
  );
}

export function getProductCardAction(product) {
  if (canQuickAdd(product)) return { type: "quick-add", label: "Añadir" };
  if (hasRequiredProductOptions(product)) return { type: "navigate", label: "Elegir opciones" };
  return { type: "navigate", label: isCustomizableProduct(product) ? "Personalizar" : "Ver producto" };
}
