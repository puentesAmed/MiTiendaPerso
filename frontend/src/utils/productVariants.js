import { normalizeVariantColorToken, resolveVariantColor } from "../features/product-designer-v2/domain/variantColors.js";

function stableToken(value) {
  return normalizeVariantColorToken(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function availableOptions(product, key) {
  return Array.isArray(product?.variants?.[key]) ? product.variants[key] : [];
}

function findCanonicalOption(options, value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const exact = options.find((option) => option === value);
  if (exact) return exact;
  const token = normalizeVariantColorToken(value);
  const matches = options.filter((option) => normalizeVariantColorToken(option) === token);
  return matches.length === 1 ? matches[0] : null;
}

export function resolveSelectedVariant(product, selection = {}) {
  const sizes = availableOptions(product, "sizes");
  const colors = availableOptions(product, "colors");
  if (sizes.length === 0 && colors.length === 0) return null;
  const size = sizes.length ? findCanonicalOption(sizes, selection.size) : null;
  const color = colors.length ? findCanonicalOption(colors, selection.color) : null;
  if ((sizes.length && !size) || (colors.length && !color)) return null;
  const sizeId = size ? stableToken(size) : null;
  const colorId = color ? resolveVariantColor(color)?.id ?? stableToken(color) : null;
  // This legacy product contract has option lists, not persisted SKU identifiers.
  const variantId = JSON.stringify([size, color]);
  return { variantId, size, sizeId, color, colorId };
}

export function toRequestedProductVariant(variant) {
  if (!variant) return null;
  const size = typeof variant.size === "string" && variant.size ? variant.size : null;
  const color = typeof variant.color === "string" && variant.color ? variant.color : null;
  return size || color ? { size, color } : null;
}
