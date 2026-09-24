import { normalizeCustomization } from "./customizationAdapter.js";

const CART_SCHEMA_VERSION = 2;

function defaultClientIdFactory() {
  return globalThis.crypto.randomUUID();
}

function cleanToken(value) {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function canonicalVariant(input) {
  const size = cleanToken(input?.size);
  const color = cleanToken(input?.color);
  return size || color ? { size, color } : null;
}

export function normalizeVariant(product, input) {
  const sizes = Array.isArray(product?.variants?.sizes)
    ? product.variants.sizes
    : [];
  const colors = Array.isArray(product?.variants?.colors)
    ? product.variants.colors
    : [];

  if (sizes.length === 0 && colors.length === 0) return null;

  const variant = canonicalVariant(input);
  if (sizes.length > 0 && !variant?.size) {
    throw new Error("Selecciona una talla");
  }
  if (colors.length > 0 && !variant?.color) {
    throw new Error("Selecciona un color");
  }
  if (variant?.size && !sizes.includes(variant.size)) {
    throw new Error("La talla seleccionada no está disponible");
  }
  if (variant?.color && !colors.includes(variant.color)) {
    throw new Error("El color seleccionado no está disponible");
  }

  return {
    size: sizes.length > 0 ? variant.size : null,
    color: colors.length > 0 ? variant.color : null,
  };
}

export function normalizeCartCustomization(
  input,
  product = null,
  createClientId = defaultClientIdFactory
) {
  const customization = normalizeCustomization(input, product);
  if (!customization || customization.type !== "designer") return null;

  return {
    ...customization,
    clientId: String(
      customization.clientId || customization._id || createClientId()
    ),
  };
}

export function buildCartLineKey({ productId, variant, customization }) {
  const normalizedVariant = canonicalVariant(variant);
  const size = normalizedVariant?.size || "-";
  const color = normalizedVariant?.color || "-";
  const customizationId = customization?.clientId || "none";

  return [
    "v2:local:",
    encodeURIComponent(String(productId)),
    ":size=",
    encodeURIComponent(size),
    "&color=",
    encodeURIComponent(color),
    ":custom=",
    encodeURIComponent(String(customizationId)),
  ].join("");
}

function getDisplayPrice(product) {
  const value =
    typeof product?.price === "object" ? product.price?.final : product?.price;
  const price = Number(value);
  return Number.isFinite(price) ? price : 0;
}

export function createCartLine({
  product,
  quantity = 1,
  variant = null,
  customization = null,
  createClientId = defaultClientIdFactory,
}) {
  const productId = String(product?._id || product?.id || "");
  const normalizedQuantity = Number(quantity);
  if (!productId || !Number.isInteger(normalizedQuantity) || normalizedQuantity <= 0) {
    throw new Error("Línea de carrito inválida");
  }
  if (product?.provider === "aliexpress") {
    throw new Error("Producto externo no disponible");
  }

  const normalizedVariant = normalizeVariant(product, variant);
  const normalizedCustomization = normalizeCartCustomization(
    customization,
    product,
    createClientId
  );
  const line = {
    schemaVersion: CART_SCHEMA_VERSION,
    productId,
    quantity: normalizedQuantity,
    variant: normalizedVariant,
    customization: normalizedCustomization,
    customizationRequired: Boolean(product?.customizable),
    presentation: {
      name: product?.name || "Producto",
      image: product?.image || product?.images?.[0] || "",
      displayPrice: getDisplayPrice(product),
    },
  };

  return {
    ...line,
    lineKey: buildCartLineKey(line),
  };
}

function legacyVariant(line) {
  const legacyCustomization = line?.customization;
  const customizationIsOnlyVariant =
    legacyCustomization &&
    legacyCustomization.type !== "designer" &&
    Object.keys(legacyCustomization).every((key) =>
      ["size", "talla", "color"].includes(key)
    );

  return canonicalVariant(
    line?.variant ||
      line?.selectedVariant || {
        size:
          line?.variantAttributes?.size ||
          line?.variantAttributes?.talla ||
          (customizationIsOnlyVariant
            ? legacyCustomization.size || legacyCustomization.talla
            : null),
        color:
          line?.variantAttributes?.color ||
          (customizationIsOnlyVariant ? legacyCustomization.color : null),
      }
  );
}

function normalizeStoredLine(line, createClientId) {
  if (!line || line.provider === "aliexpress" || line.externalId) return null;

  const productId = String(line.productId || line._id || "");
  const quantity = Number(line.quantity);
  if (!productId || !Number.isInteger(quantity) || quantity <= 0) return null;

  const legacyCustomization = line.customization;
  const customizationIsOnlyVariant =
    legacyCustomization &&
    legacyCustomization.type !== "designer" &&
    Object.keys(legacyCustomization).every((key) =>
      ["size", "talla", "color"].includes(key)
    );
  const customization = normalizeCartCustomization(
    customizationIsOnlyVariant ? null : legacyCustomization,
    { _id: productId, name: line.presentation?.name || line.name },
    createClientId
  );
  const variant = legacyVariant(line);
  const price = Number(
    line.presentation?.displayPrice ?? line.price ?? 0
  );
  const normalized = {
    schemaVersion: CART_SCHEMA_VERSION,
    productId,
    quantity,
    variant,
    customization,
    customizationRequired: Boolean(
      line.customizationRequired ?? line.requiresDesign ?? line.customizable
    ),
    presentation: {
      name: line.presentation?.name || line.name || "Producto",
      image: line.presentation?.image || line.image || "",
      displayPrice: Number.isFinite(price) ? price : 0,
    },
  };

  return {
    ...normalized,
    lineKey: buildCartLineKey(normalized),
  };
}

export function normalizeStoredCart(
  payload,
  { createClientId = defaultClientIdFactory } = {}
) {
  const source = Array.isArray(payload) ? payload : payload?.items;
  if (!Array.isArray(source)) {
    return { items: [], omittedCount: 0, warnings: [] };
  }

  const items = [];
  const warnings = [];
  source.forEach((line, index) => {
    const normalized = normalizeStoredLine(line, createClientId);
    if (normalized) items.push(normalized);
    else warnings.push(`Línea ${index + 1} omitida durante la migración`);
  });

  return { items, omittedCount: warnings.length, warnings };
}

export function buildCartStoragePayload(items, updatedAt = new Date().toISOString()) {
  return { version: 2, items, updatedAt };
}

export function buildGuestCartSession(
  existing,
  items,
  { guestId, updatedAt = new Date().toISOString() }
) {
  return {
    ...(existing || {}),
    cartVersion: 2,
    cart: items,
    version: existing?.version || 1,
    guestId: existing?.guestId || guestId,
    updatedAt,
  };
}

export function addOrMergeCartLine(items, line) {
  const index = items.findIndex((item) => item.lineKey === line.lineKey);
  if (index === -1) return [...items, line];

  return items.map((item, currentIndex) =>
    currentIndex === index
      ? { ...item, quantity: item.quantity + line.quantity }
      : item
  );
}

export function updateCartLineQuantity(items, lineKey, quantity) {
  const normalizedQuantity = Number(quantity);
  return items
    .map((item) =>
      item.lineKey === lineKey
        ? { ...item, quantity: Number.isInteger(normalizedQuantity) ? normalizedQuantity : 0 }
        : item
    )
    .filter((item) => item.quantity > 0);
}

export function removeCartLine(items, lineKey) {
  return items.filter((item) => item.lineKey !== lineKey);
}

export function updateCartLineCustomization(
  items,
  lineKey,
  customization,
  createClientId = defaultClientIdFactory
) {
  const current = items.find((item) => item.lineKey === lineKey);
  if (!current) return items;

  const normalized = normalizeCartCustomization(
    {
      ...customization,
      clientId: current.customization?.clientId || customization?.clientId,
    },
    { _id: current.productId, name: current.presentation.name },
    createClientId
  );
  const updated = {
    ...current,
    customization: normalized,
  };
  updated.lineKey = buildCartLineKey(updated);

  return items.map((item) => (item.lineKey === lineKey ? updated : item));
}

export function toCheckoutItem(line, { includeCustomization = true } = {}) {
  const item = {
    productId: line.productId,
    quantity: line.quantity,
    variant: line.variant,
  };
  if (includeCustomization) item.customization = line.customization;
  return item;
}
