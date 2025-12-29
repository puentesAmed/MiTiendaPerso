import { Product } from "../models/Product.js";
import { AffiliateProduct } from "../models/AffiliateProduct.js";


export async function getProducts(req, res) {
  try {
    const { category, q } = req.query;

    const filter = {published: true};
    if (category) filter.category = category;
    if (q) filter.name = { $regex: q, $options: "i" };

    const [localProducts, affiliateProducts] = await Promise.all([
      Product.find(filter).lean(),
      AffiliateProduct.find(filter).lean(),
    ]);

    const sortedLocalProducts = localProducts.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    const sortedAffiliateProducts = affiliateProducts.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    const products = [
      ...sortedLocalProducts,
      ...sortedAffiliateProducts,
    ];

    res.json({ ok: true, products });
  } catch (err) {
    console.error("Error en getProducts:", err);
    res.status(500).json({ ok: false });
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

    res.json({ ok: true, product });
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
