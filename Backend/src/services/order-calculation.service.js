import mongoose from "mongoose";
import { Product } from "../models/Product.js";

export class OrderCalculationError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "OrderCalculationError";
    this.status = status;
  }
}

function normalizeRequestedVariant(input) {
  if (input == null) return null;
  if (typeof input !== "object" || Array.isArray(input)) {
    throw new OrderCalculationError("Variante inválida");
  }
  if (Object.keys(input).some((key) => !["size", "color"].includes(key))) {
    throw new OrderCalculationError("Variante inválida");
  }

  for (const value of [input.size, input.color]) {
    if (value != null && typeof value !== "string") {
      throw new OrderCalculationError("Variante inválida");
    }
  }

  const size = input.size || null;
  const color = input.color || null;
  return size || color ? { size, color } : null;
}

function resolveRequestedVariant(item) {
  const hasVariant = Object.hasOwn(item, "variant");
  const hasLegacyVariant = Object.hasOwn(item, "selectedVariant");
  const variant = hasVariant ? normalizeRequestedVariant(item.variant) : null;
  const legacyVariant = hasLegacyVariant
    ? normalizeRequestedVariant(item.selectedVariant)
    : null;

  if (
    hasVariant &&
    hasLegacyVariant &&
    JSON.stringify(variant) !== JSON.stringify(legacyVariant)
  ) {
    throw new OrderCalculationError("La variante enviada es contradictoria");
  }

  return hasVariant ? variant : legacyVariant;
}

function validateVariant(product, variant) {
  const sizes = product.variants?.sizes || [];
  const colors = product.variants?.colors || [];
  const size = variant?.size || null;
  const color = variant?.color || null;

  if (sizes.length === 0 && size) {
    throw new OrderCalculationError(`Talla no válida para: ${product.name}`);
  }

  if (colors.length === 0 && color) {
    throw new OrderCalculationError(`Color no válido para: ${product.name}`);
  }

  if (sizes.length > 0 && (!size || !sizes.includes(size))) {
    throw new OrderCalculationError(
      `Selecciona una talla válida para: ${product.name}`
    );
  }

  if (colors.length > 0 && (!color || !colors.includes(color))) {
    throw new OrderCalculationError(
      `Selecciona un color válido para: ${product.name}`
    );
  }

  return size || color ? { size, color } : null;
}

function roundCurrency(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function resolveAuthoritativeOrderLines(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new OrderCalculationError("El carrito está vacío");
  }

  const normalizedItems = items.map((item) => {
    if (item?.provider === "aliexpress") {
      throw new OrderCalculationError("Producto no disponible (aliexpress)");
    }

    const productId = String(item?.productId || "");
    const quantity = Number(item?.quantity);

    if (
      !mongoose.Types.ObjectId.isValid(productId) ||
      !Number.isInteger(quantity) ||
      quantity <= 0
    ) {
      throw new OrderCalculationError("Línea de carrito inválida");
    }

    return { ...item, productId, quantity };
  });

  const productIds = [...new Set(normalizedItems.map((item) => item.productId))];
  const products = await Product.find({
    _id: { $in: productIds },
    active: true,
  });
  const productsById = new Map(
    products.map((product) => [product._id.toString(), product])
  );

  const requestedByProduct = new Map();
  for (const item of normalizedItems) {
    requestedByProduct.set(
      item.productId,
      (requestedByProduct.get(item.productId) || 0) + item.quantity
    );
  }

  const stockRequirements = [];
  for (const [productId, quantity] of requestedByProduct) {
    const product = productsById.get(productId);
    if (!product) {
      throw new OrderCalculationError("Producto no disponible");
    }
    if (!Number.isFinite(product.price) || product.price < 0) {
      throw new OrderCalculationError(
        `Precio no válido para: ${product.name}`
      );
    }
    if (!Number.isFinite(product.stock) || product.stock < quantity) {
      throw new OrderCalculationError(
        `Stock insuficiente para: ${product.name}`,
        409
      );
    }
    stockRequirements.push({ productId: product._id, quantity });
  }

  let subtotal = 0;
  const lines = normalizedItems.map((item) => {
    const product = productsById.get(item.productId);
    const variant = validateVariant(product, resolveRequestedVariant(item));
    const price = roundCurrency(Number(product.price));
    subtotal = roundCurrency(subtotal + price * item.quantity);

    return {
      product,
      productId: product._id,
      name: product.name,
      price,
      quantity: item.quantity,
      variant,
      customization: item.customization || null,
    };
  });

  return { lines, subtotal, stockRequirements };
}

export { roundCurrency };
