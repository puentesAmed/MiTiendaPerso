/*

import { Product } from "../models/Product.js";
import { AffiliateProduct } from "../models/AffiliateProduct.js";

/**
 * 🔐 NORMALIZADOR ÚNICO DE PRECIO
 * - Internos: price (number) → final
 * - AliExpress: price.final YA calculado
 * ⚠️ Si un producto llega aquí sin precio válido → ERROR
 */
/*
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

  // 🔹 Producto interno
  if (typeof product.price === "number") {
    return {
      final: product.price,
      currency: "EUR",
    };
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
/*
function mapToCatalogProduct(product) {
  const isAliExpress = product.provider === "aliexpress";

  //const price = normalizePrice(product);

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


  return {
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
    /*stock: isAliExpress
      ? product.variants?.some(v => Number(v.stock?.quantity) > 0)
        ? 1
        : 0
      : product.stock,*/

    // 🧮 STOCK SIMPLE PARA UI
    /*
    stock: isAliExpress
      ? (
          // ✅ Si tiene variantes reales, depende de ellas
          Array.isArray(product.variants) && product.variants.length > 1
            ? product.variants.some(v => Number(v.stock?.quantity) > 0)
              ? 1
              : 0
            // ✅ Si NO tiene variantes reales → producto simple → disponible
            : 1
        )
      : product.stock,



    // 🧭 SOLO PARA NAVEGACIÓN
    hasVariants: isAliExpress
      ? Array.isArray(product.variants) && product.variants.length > 1
      : (
          product.variants?.sizes?.length > 0 ||
          product.variants?.colors?.length > 0
        ),

    // 🧩 SOLO DETALLE
    //variants: isAliExpress ? product.variants : product.variants,
    variants: isAliExpress && Array.isArray(product.variants) && product.variants.length > 1
      ? product.variants
      : null,


    customizable: !!product.customizable,
  };
}

/* ───────────────────────────────────────────── */
/* GET /api/products                             */
/* ───────────────────────────────────────────── */
/*
export async function getProducts(req, res) {
  try {
    const { category, q } = req.query;

    const localFilter = { active: true };
    const affiliateFilter = { enabled: true, status: "active" };

    if (category) {
      localFilter.category = category;
      affiliateFilter.category = category;
    }

    if (q) {
      localFilter.name = { $regex: q, $options: "i" };
      affiliateFilter.$or = [
        { title: { $regex: q, $options: "i" } },
        { name: { $regex: q, $options: "i" } },
      ];
    }

    const [localProducts, affiliateProducts] = await Promise.all([
      Product.find(localFilter).sort({ createdAt: -1 }).lean(),
      AffiliateProduct.find(affiliateFilter).sort({ createdAt: -1 }).lean(),
    ]);

    const products = [...localProducts, ...affiliateProducts]
      .map(mapToCatalogProduct);

    res.json({ ok: true, products });

  } catch (err) {
    console.error("Error en getProducts:", err);
    res.status(500).json({ ok: false, message: err.message });
  }
}

/* ───────────────────────────────────────────── */
/* GET /api/products/:id                         */
/* ───────────────────────────────────────────── */
/*
export async function getProduct(req, res) {
  try {
    const { id } = req.params;

    let product = await Product.findById(id).lean();
    if (!product) {
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
      product: mapToCatalogProduct(product),
    });

  } catch (err) {
    console.error("Error en getProduct:", err);
    res.status(500).json({ ok: false, message: err.message });
  }
}

/* ───────────────────────────────────────────── */
/* CRUD INTERNO (NO TOCAMOS)                     */
/* ───────────────────────────────────────────── */
/*
export async function createProduct(req, res) {
  try {
    const product = new Product(req.body);
    await product.save();
    res.status(201).json({ ok: true, product });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
}

export async function updateProduct(req, res) {
  try {
    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ ok: false, message: "Producto no encontrado" });
    }

    res.json({ ok: true, product: updated });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
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
*/

import { Product } from "../models/Product.js";
import { AffiliateProduct } from "../models/AffiliateProduct.js";

/**
 * 🔐 NORMALIZADOR ÚNICO DE PRECIO
 */
function normalizePrice(product, variant = null) {
  // 🔹 Variante AliExpress
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

  // 🔹 Producto interno
  if (typeof product.price === "number") {
    return {
      final: product.price,
      currency: "EUR",
    };
  }

  // 🔹 AliExpress sin variantes
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
/*function mapToCatalogProduct(product) {
  /**
   * 🔴 DETECCIÓN ROBUSTA DE ALIEXPRESS
   * - NO dependemos solo de provider
   * - AffiliateProduct no tiene stock real
   *//*
  const isAliExpress =
    product.provider === "aliexpress" ||
    !("stock" in product);

  /* -------------------------------------------------- */
  /* PRECIO                                             */
  /* -------------------------------------------------- */
  /*
  let price;

  if (
    isAliExpress &&
    Array.isArray(product.variants) &&
    product.variants.length > 0
  ) {
    const cheapestVariant = product.variants.reduce((min, v) =>
      v.price.final < min.price.final ? v : min
    );

    price = normalizePrice(product, cheapestVariant);
  } else {
    price = normalizePrice(product);
  }

  /* -------------------------------------------------- */
  /* VARIANTES REALES                                   */
  /* -------------------------------------------------- */
  /*
  const hasRealVariants =
    isAliExpress &&
    Array.isArray(product.variants) &&
    product.variants.length > 1;

  return {
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

    /* -------------------------------------------------- */
    /* PRECIO FINAL                                      */
    /* -------------------------------------------------- *//*
    price,

    /* -------------------------------------------------- */
    /* STOCK (CLAVE)                                     */
    /* -------------------------------------------------- *//*
    stock: isAliExpress
      ? (
          hasRealVariants
            ? product.variants.some(
                v => Number(v.stock?.quantity) > 0
              )
              ? 1
              : 0
            : 1 // ✅ AliExpress sin variantes reales → disponible
        )
      : product.stock,

    /* -------------------------------------------------- */
    /* VARIANTES / NAVEGACIÓN                             */
    /* -------------------------------------------------- *//*
      ? hasRealVariants
      : (
          product.variants?.sizes?.length > 0 ||
          product.variants?.colors?.length > 0
        ),

    variants: isAliExpress
      ? hasRealVariants
        ? product.variants
        : null
      : product.variants,

    customizable: !!product.customizable,
  };
}
*/
function mapToCatalogProduct(product) {
  /**
   * 🔴 DETECCIÓN ROBUSTA DE ALIEXPRESS
   */
  const isAliExpress =
    product.provider === "aliexpress" ||
    !("stock" in product);

  /* -------------------------------------------------- */
  /* VARIANTES (ALIEXPRESS SIEMPRE ARRAY)               */
  /* -------------------------------------------------- */
  const variants = isAliExpress
    ? Array.isArray(product.variants)
      ? product.variants
      : []
    : product.variants;

  const hasRealVariants =
    isAliExpress && variants.length > 1;

  /* -------------------------------------------------- */
  /* PRECIO                                             */
  /* -------------------------------------------------- */
  let price;

  if (isAliExpress && variants.length > 0) {
    const cheapestVariant = variants.reduce((min, v) =>
      v.price?.final < min.price?.final ? v : min
    );

    price = normalizePrice(product, cheapestVariant);
  } else {
    price = normalizePrice(product);
  }

  /* -------------------------------------------------- */
  /* STOCK                                              */
  /* -------------------------------------------------- */
  const stock = isAliExpress
    ? variants.some(v => Number(v.stock?.quantity) > 0)
      ? 1
      : 0
    : product.stock;

  return {
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

    /* ----------------------------- */
    /* PRECIO FINAL                  */
    /* ----------------------------- */
    price,

    /* ----------------------------- */
    /* STOCK SIMPLE PARA UI          */
    /* ----------------------------- */
    stock,

    /* ----------------------------- */
    /* VARIANTES / NAVEGACIÓN        */
    /* ----------------------------- */
    hasVariants: isAliExpress
      ? hasRealVariants
      : (
          product.variants?.sizes?.length > 0 ||
          product.variants?.colors?.length > 0
        ),

    /**
     * 🔴 CLAVE ABSOLUTA
     * AliExpress → SIEMPRE variants (aunque solo haya una)
     */
    variants,

    customizable: !!product.customizable,
  };
}


/* ───────────────────────────────────────────── */
/* GET /api/products                             */
/* ───────────────────────────────────────────── */
export async function getProducts(req, res) {
  try {
    const { category, q } = req.query;

    const localFilter = { active: true };
    const affiliateFilter = { enabled: true, status: "active" };

    if (category) {
      localFilter.category = category;
      affiliateFilter.category = category;
    }

    if (q) {
      localFilter.name = { $regex: q, $options: "i" };
      affiliateFilter.$or = [
        { title: { $regex: q, $options: "i" } },
        { name: { $regex: q, $options: "i" } },
      ];
    }

    const [localProducts, affiliateProducts] = await Promise.all([
      Product.find(localFilter).sort({ createdAt: -1 }).lean(),
      AffiliateProduct.find(affiliateFilter).sort({ createdAt: 1 }).lean(),
    ]);

    const products = [...localProducts, ...affiliateProducts]
      .map(mapToCatalogProduct);

    res.json({ ok: true, products });

  } catch (err) {
    console.error("Error en getProducts:", err);
    res.status(500).json({ ok: false, message: err.message });
  }
}

/* ───────────────────────────────────────────── */
/* GET /api/products/:id                         */
/* ───────────────────────────────────────────── */
export async function getProduct(req, res) {
  try {
    const { id } = req.params;

    let product = await Product.findById(id).lean();
    if (!product) {
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
      product: mapToCatalogProduct(product),
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
    const product = new Product(req.body);
    await product.save();
    res.status(201).json({ ok: true, product });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
}

export async function updateProduct(req, res) {
  try {
    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!updated) {
      return res.status(404).json({ ok: false, message: "Producto no encontrado" });
    }

    res.json({ ok: true, product: updated });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
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
