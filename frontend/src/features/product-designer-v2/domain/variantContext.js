import { normalizeVariantColorToken, resolveVariantColor } from "./variantColors.js";

function normalizedToken(value) {
  return normalizeVariantColorToken(value);
}

function stableToken(value) {
  return normalizedToken(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function availableOptions(product, key) {
  return Array.isArray(product?.variants?.[key]) ? product.variants[key] : [];
}

function colorDefinition(value) {
  return resolveVariantColor(value);
}

function findSizeById(product, sizeId) {
  return availableOptions(product, "sizes").find((size) => stableToken(size) === sizeId) ?? null;
}

function findColorById(product, colorId) {
  return availableOptions(product, "colors").find((color) => colorDefinition(color)?.id === colorId) ?? null;
}

export function createDesignerVariantContext(product, selection = {}) {
  const sizes = availableOptions(product, "sizes");
  const colors = availableOptions(product, "colors");
  const size = sizes.length ? sizes.find((option) => option === selection.size) ?? null : null;
  const color = colors.length ? colors.find((option) => option === selection.color) ?? null : null;
  if ((sizes.length && !size) || (colors.length && !color)) return null;
  const colorId = color ? colorDefinition(color)?.id ?? null : null;
  if (color && !colorId) return null;
  const sizeId = size ? stableToken(size) : null;
  const variantId = colorId || sizeId || null;
  return variantId ? { variantId, size, sizeId, color, colorId } : null;
}

export function serializeDesignerVariantContext(context) {
  const params = new URLSearchParams();
  if (context?.sizeId) params.set("size", context.sizeId);
  if (context?.colorId) params.set("color", context.colorId);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function resolveDesignerVariantContext(product, { search = "", stateVariant = null } = {}) {
  const sizes = availableOptions(product, "sizes");
  const colors = availableOptions(product, "colors");
  if (!sizes.length && !colors.length) return null;
  const params = new URLSearchParams(search);
  const size = findSizeById(product, params.get("size")) || stateVariant?.size || null;
  const color = findColorById(product, params.get("color")) || stateVariant?.color || null;
  return createDesignerVariantContext(product, { size, color });
}

export function buildDesignerV2Location(productId, context) {
  return `/personalizar-v2/${productId}${serializeDesignerVariantContext(context)}`;
}

export function sameDesignerVariant(first, second) {
  return (first?.variantId ?? null) === (second?.variantId ?? null)
    && (first?.sizeId ?? null) === (second?.sizeId ?? null)
    && (first?.colorId ?? null) === (second?.colorId ?? null);
}

