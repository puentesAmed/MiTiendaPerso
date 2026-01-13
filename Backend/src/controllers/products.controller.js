import { Product } from "../models/Product.js";
import { AffiliateProduct } from "../models/AffiliateProduct.js";


function mapProductToCatalogView(product) {
  const isAliExpress = product.provider === "aliexpress";

  // 🔹 Variantes
  const variants = isAliExpress
    ? product.variants?.map(v => ({
        id: v.skuId,
        label: Object.values(v.attributes || {}).join(" · "),
        price: v.price?.final,
        available: v.enabled !== false,
        providerSku: v.skuId,
      })) || []
    : [
        {
          id: "default",
          label: "Única",
          price: product.price,
          available: product.stock > 0,
        },
      ];

  const prices = variants.map(v => v.price).filter(Boolean);

  return {
    id: product._id,
    name: product.name || product.title,
    description: product.description,
    images: product.images?.length ? product.images : [product.image],
    provider: product.provider || "local",

    price: {
      from: Math.min(...prices),
      to: Math.max(...prices),
    },

    variants,

    customizable: product.customizable || false,
    customizationAreas: product.customizationAreas || [],
  };
}


// GET /api/products
export async function getProducts(req, res) {
  try {
    const { category, q } = req.query;

    // ✅ Productos internos: usan "active"
    const localFilter = { active: true };

    // ✅ Affiliate: usan enabled + status
    const affiliateFilter = { enabled: true, status: "active" };

    if (category) {
      localFilter.category = category;
      affiliateFilter.category = category; // si en AffiliateProduct guardas "category"
    }

    if (q) {
      localFilter.name = { $regex: q, $options: "i" };
      // affiliate normalmente trae "title" o "name" según tu mapper
      affiliateFilter.$or = [
        { title: { $regex: q, $options: "i" } },
        { name: { $regex: q, $options: "i" } },
      ];
    }

    const [localProducts, affiliateProducts] = await Promise.all([
      Product.find(localFilter).sort({ createdAt: -1 }).lean(),
      AffiliateProduct.find(affiliateFilter).sort({ createdAt: -1 }).lean(),
    ]);

    // ✅ Internos primero
    const products = [...localProducts, ...affiliateProducts]
      .map(mapProductToCatalogView);

    res.json({ ok: true, products });

  } catch (err) {
    console.error("Error en getProducts:", err);
    res.status(500).json({ ok: false, message: "Error en getProducts" });
  }
}


// GET /api/products/:id
export async function getProduct(req, res) {
  try {
    const { id } = req.params;
    let product = await Product.findById(id);

    if (!product) {
      product = await AffiliateProduct.findById(id);
    }


    if (!product) {
      return res
        .status(404)
        .json({ ok: false, message: "Producto no encontrado" });
    }

    res.json({
      ok: true,
      product: mapProductToCatalogView(product),
    });

  } catch (err) {
    console.error("Error en getProduct:", err);
    res.status(500).json({ ok: false, message: "Error al obtener el producto" });
  }
}

// POST /api/products
export async function createProduct(req, res) {
  try {
    const { name, price, category, stock, description, image } = req.body;

    const product = new Product({
      name,
      price,
      category,
      stock,
      description,
      image,
    });

    await product.save();

    res.status(201).json({ ok: true, product });
  } catch (err) {
    console.error("Error en createProduct:", err);
    res.status(500).json({ ok: false, message: "Error al crear producto" });
  }
}

// PUT /api/products/:id
export async function updateProduct(req, res) {
  try {
    const { id } = req.params;

    const updated = await Product.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return res
        .status(404)
        .json({ ok: false, message: "Producto no encontrado" });
    }

    res.json({ ok: true, product: updated });
  } catch (err) {
    console.error("Error en updateProduct:", err);
    res.status(500).json({ ok: false, message: "Error al actualizar producto" });
  }
}

// DELETE /api/products/:id
export async function deleteProduct(req, res) {
  try {
    const { id } = req.params;

    const deleted = await Product.findByIdAndDelete(id);

    if (!deleted) {
      return res
        .status(404)
        .json({ ok: false, message: "Producto no encontrado" });
    }

    res.json({ ok: true, message: "Producto eliminado" });
  } catch (err) {
    console.error("Error en deleteProduct:", err);
    res.status(500).json({ ok: false, message: "Error al eliminar producto" });
  }
}
