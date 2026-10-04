
import { Product } from "../models/Product.js";
import { env } from "../config/env.js";
import { FulfillmentProfileError, normalizeFulfillmentProfile } from "../services/fulfillment.service.js";
import { CustomizationPricingError, getPublicCustomizationPricing, normalizeCustomizationPricing, resolveCustomizationQuote } from "../services/customization-pricing.service.js";
import { validateRequestedProductVariant } from "../services/order-calculation.service.js";

async function loadAffiliateProductModel() {
  const { AffiliateProduct } = await import("../models/AffiliateProduct.js");
  return AffiliateProduct;
}

/**
 * 🔐 NORMALIZADOR ÚNICO DE PRECIO
 * - Internos: price (number) → final
 * - AliExpress: price.final YA calculado
 * ⚠️ Si un producto llega aquí sin precio válido → ERROR
 */
function normalizePrice(product, variant = null) {
  // 🔹 Si hay variante (AliExpress)
  if (variant?.price?.final) {
    return {
      final: variant.price.final,
      currency: "EUR",
      breakdown: {
        cost: variant.price.cost,
        margin: variant.price.margin,
      },
    };
  }

  // 🔹 Producto interno (number legacy)
  if (typeof product.price === "number") {
    return {
      final: product.price,
      currency: "EUR",
    };
  }

  // 🔹 Producto interno con schema actual ({ value, cost, margin, currency })
  if (typeof product.price?.value === "number") {
    const payload = {
      final: product.price.value,
      currency: product.price.currency || "EUR",
    };

    if (
      typeof product.price.cost === "number" ||
      typeof product.price.margin === "number"
    ) {
      payload.breakdown = {
        cost: product.price.cost,
        margin: product.price.margin,
      };
    }

    return payload;
  }

  // 🔹 Producto AliExpress SIN variantes (edge case)
  if (product.price?.final && typeof product.price.final === "number") {
    return {
      final: product.price.final,
      currency: "EUR",
      breakdown: {
        cost: product.price.cost,
        margin: product.price.margin,
      },
    };
  }

  throw new Error(`Producto sin precio válido (_id: ${product._id})`);
}


/**
 * 🧩 MAPEO PARA CATÁLOGO Y DETALLE
 * Devuelve SOLO lo que la tienda necesita
 */
function mapToCatalogProduct(product, { includeProductTemplateId = false } = {}) {
  const isAliExpress = product.provider === "aliexpress";

  let price;

  if (
    isAliExpress &&
    Array.isArray(product.variants) &&
    product.variants.length > 0
  ) {
    // 👉 Usamos el precio MÁS BARATO de las variantes (para catálogo)
    const cheapestVariant = product.variants.reduce((min, v) =>
      v.price.final < min.price.final ? v : min
    );

    price = normalizePrice(product, cheapestVariant);

  } else {
    // 👉 Productos internos o AliExpress sin variantes
    price = normalizePrice(product);
  }


  const mappedProduct = {
    _id: product._id,
    provider: product.provider || "local",

    name: product.name || product.title,
    description: product.description || "",

    image:
      product.image ||
      (Array.isArray(product.images) && product.images.length > 0
        ? product.images[0]
        : null),

    images: Array.isArray(product.images) ? product.images : [],

    category: product.category || null,

    // 🔐 PRECIO FINAL ÚNICO (EL QUE SE VENDE)
    price,

    // 🧮 STOCK SIMPLE PARA UI
    stock: isAliExpress
      ? product.variants?.some(v => Number(v.stock?.quantity) > 0)
        ? 1
        : 0
      : product.stock,

    // 🧭 SOLO PARA NAVEGACIÓN
    hasVariants: isAliExpress
      ? Array.isArray(product.variants) && product.variants.length > 0
      : (
          product.variants?.sizes?.length > 0 ||
          product.variants?.colors?.length > 0
        ),

    // 🧩 SOLO DETALLE
    variants: isAliExpress ? product.variants : product.variants,

    customizable: !!product.customizable,
    customizationPricing: getPublicCustomizationPricing(product),
  };

  if (includeProductTemplateId) {
    mappedProduct.productTemplateId = typeof product.productTemplateId === "string" && product.productTemplateId.trim()
      ? product.productTemplateId.trim()
      : null;
  }

  return mappedProduct;
}

/* ───────────────────────────────────────────── */
/* GET /api/products                             */
/* ───────────────────────────────────────────── */
export async function getProducts(req, res) {
  try {
    const { category, q } = req.query;

    const localFilter = { active: true };

    if (category) {
      localFilter.category = category;
    }

    if (q) {
      localFilter.name = { $regex: q, $options: "i" };
    }

    const localProducts = await Product.find(localFilter)
      .sort({ createdAt: -1 })
      .lean();
    let affiliateProducts = [];

    if (env.ALIEXPRESS_CATALOG_ENABLED) {
      const AffiliateProduct = await loadAffiliateProductModel();
      const affiliateFilter = { enabled: true, status: "active" };

      if (category) affiliateFilter.category = category;
      if (q) {
        affiliateFilter.$or = [
          { title: { $regex: q, $options: "i" } },
          { name: { $regex: q, $options: "i" } },
        ];
      }

      affiliateProducts = await AffiliateProduct.find(affiliateFilter)
        .sort({ createdAt: -1 })
        .lean();
    }

    const products = [...localProducts, ...affiliateProducts]
      .map(mapToCatalogProduct);

    res.json({ ok: true, products });

  } catch (err) {
    console.error("Error en getProducts:", err);
    res.status(500).json({ ok: false, message: err.message });
  }
}

export async function adminGetProducts(req, res) {
  try {
    const products = await Product.find({}).sort({ createdAt: -1 }).lean();
    return res.json({ ok: true, products });
  } catch (err) {
    console.error("Error en adminGetProducts:", err);
    return res.status(500).json({ ok: false, message: "Error al obtener productos" });
  }
}

/* ───────────────────────────────────────────── */
/* GET /api/products/:id                         */
/* ───────────────────────────────────────────── */
export async function getProduct(req, res) {
  try {
    const { id } = req.params;

    let product = await Product.findById(id).lean();
    if (!product && env.ALIEXPRESS_CATALOG_ENABLED) {
      const AffiliateProduct = await loadAffiliateProductModel();
      product = await AffiliateProduct.findById(id).lean();
    }

    if (!product) {
      return res.status(404).json({
        ok: false,
        message: "Producto no encontrado",
      });
    }

    res.json({
      ok: true,
      product: mapToCatalogProduct(product, { includeProductTemplateId: true }),
    });

  } catch (err) {
    console.error("Error en getProduct:", err);
    res.status(500).json({ ok: false, message: err.message });
  }
}

/* ───────────────────────────────────────────── */
/* CRUD INTERNO (NO TOCAMOS)                     */
/* ───────────────────────────────────────────── */

export async function createProduct(req, res) {
  try {
    const payload = { ...req.body };
    if (Object.hasOwn(payload, "fulfillmentProfile")) payload.fulfillmentProfile = normalizeFulfillmentProfile(payload.fulfillmentProfile);
    if (Object.hasOwn(payload, "customizationPricing")) payload.customizationPricing = normalizeCustomizationPricing(payload.customizationPricing, payload.productTemplateId);
    const product = new Product(payload);
    await product.save();
    res.status(201).json({ ok: true, product });
  } catch (err) {
    res.status(err instanceof FulfillmentProfileError || err instanceof CustomizationPricingError || err?.name === "ValidationError" ? 400 : 500).json({ ok: false, message: err.message });
  }
}

export async function updateProduct(req, res) {
  try {
    const payload = { ...req.body };
    if (Object.hasOwn(payload, "fulfillmentProfile")) payload.fulfillmentProfile = normalizeFulfillmentProfile(payload.fulfillmentProfile);
    if (Object.hasOwn(payload, "customizationPricing")) {
      const current = await Product.findById(req.params.id).select("productTemplateId").lean();
      payload.customizationPricing = normalizeCustomizationPricing(payload.customizationPricing, payload.productTemplateId || current?.productTemplateId);
    }
    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      payload,
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ ok: false, message: "Producto no encontrado" });
    }

    res.json({ ok: true, product: updated });
  } catch (err) {
    res.status(err instanceof FulfillmentProfileError || err instanceof CustomizationPricingError || err?.name === "ValidationError" ? 400 : 500).json({ ok: false, message: err.message });
  }
}

export async function quoteCustomization(req, res) {
  try {
    const product = await Product.findOne({ _id: req.params.id, active: true });
    if (!product) return res.status(404).json({ ok: false, message: "Producto no encontrado" });
    validateRequestedProductVariant(product, req.body?.variant ?? null);
    const quote = resolveCustomizationQuote(product, req.body?.selectedSurfaceIds);
    return res.json({ ok: true, quote });
  } catch (err) {
    const status = err instanceof CustomizationPricingError || err?.name === "OrderCalculationError" ? err.status || 400 : 500;
    return res.status(status).json({ ok: false, message: err.message });
  }
}

export async function deleteProduct(req, res) {
  try {
    const deleted = await Product.findByIdAndDelete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ ok: false, message: "Producto no encontrado" });
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
}
