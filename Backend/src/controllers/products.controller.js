import { Product } from "../models/Product.js";

/**
 * GET /api/products
 * Lista todos los productos con filtros opcionales
 */
export async function getProducts(req, res) {
  try {
    const { category, q, minPrice, maxPrice } = req.query;

    const filter = {};

    if (category) filter.category = category;
    if (q) filter.name = { $regex: q, $options: "i" };
    if (minPrice) filter.price = { ...filter.price, $gte: Number(minPrice) };
    if (maxPrice) filter.price = { ...filter.price, $lte: Number(maxPrice) };

    const products = await Product.find(filter).sort({ createdAt: -1 });

    res.json({ ok: true, products });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Error al obtener productos" });
  }
}

/**
 * GET /api/products/:id
 * Obtiene un único producto
 */
export async function getProduct(req, res) {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);

    if (!product)
      return res.status(404).json({ ok: false, message: "Producto no encontrado" });

    res.json({ ok: true, product });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Error al obtener el producto" });
  }
}

/**
 * POST /api/products
 * Crea un nuevo producto
 */
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
    res.status(500).json({ ok: false, message: "Error al crear producto" });
  }
}

/**
 * PUT /api/products/:id
 * Actualiza un producto
 */
export async function updateProduct(req, res) {
  try {
    const { id } = req.params;

    const updated = await Product.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!updated)
      return res.status(404).json({ ok: false, message: "Producto no encontrado" });

    res.json({ ok: true, product: updated });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Error al actualizar producto" });
  }
}

/**
 * DELETE /api/products/:id
 * Elimina un producto
 */
export async function deleteProduct(req, res) {
  try {
    const { id } = req.params;

    const deleted = await Product.findByIdAndDelete(id);

    if (!deleted)
      return res.status(404).json({ ok: false, message: "Producto no encontrado" });

    res.json({ ok: true, message: "Producto eliminado" });
  } catch (err) {
    res.status(500).json({ ok: false, message: "Error al eliminar producto" });
  }
}
