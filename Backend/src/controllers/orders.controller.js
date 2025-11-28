import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";

/**
 * POST /api/orders
 * Crea un pedido a partir del carrito enviado por el cliente.
 * No confía en precios ni totales del frontend: se recalculan con datos de BD.
 *
 * Body esperado:
 * {
 *   "items": [
 *     { "productId": "....", "quantity": 2 },
 *     { "productId": "....", "quantity": 1 }
 *   ]
 * }
 */
export async function createOrder(req, res) {
  try {
    const userId = req.userId; // establecido por requireAuth
    const { items } = req.body;

    if (!userId) {
      return res.status(401).json({ ok: false, message: "No autenticado" });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ ok: false, message: "El carrito está vacío" });
    }

    // IDs de productos del carrito
    const productIds = items.map((i) => i.productId);

    // Recuperar productos desde BD
    const products = await Product.find({ _id: { $in: productIds }, active: true });
    const productsMap = new Map(products.map((p) => [p._id.toString(), p]));

    const orderItems = [];
    let total = 0;

    for (const cartItem of items) {
      const { productId, quantity } = cartItem;
      const qty = Number(quantity) || 0;

      if (!productId || qty <= 0) {
        return res.status(400).json({
          ok: false,
          message: "Línea de carrito inválida",
        });
      }

      const product = productsMap.get(productId);
      if (!product) {
        return res.status(400).json({
          ok: false,
          message: `Producto no disponible: ${productId}`,
        });
      }

      if (product.stock < qty) {
        return res.status(400).json({
          ok: false,
          message: `Stock insuficiente para: ${product.name}`,
        });
      }

      const price = Number(product.price) || 0;
      const lineTotal = price * qty;

      orderItems.push({
        productId: product._id,
        name: product.name,
        price,
        quantity: qty,
      });

      total += lineTotal;
    }

    if (total <= 0) {
      return res.status(400).json({
        ok: false,
        message: "Total de pedido inválido",
      });
    }

    // (Opcional) Actualizar stock de los productos
    // Nota: para entornos críticos, usar transacciones con session de Mongoose.
    await Promise.all(
      orderItems.map((item) =>
        Product.updateOne(
          { _id: item.productId, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity } }
        )
      )
    );

    // Crear pedido
    const order = await Order.create({
      userId,
      items: orderItems,
      total,
      status: "pending", // o el valor por defecto del modelo
    });

    return res.status(201).json({
      ok: true,
      orderId: order._id,
      order,
    });
  } catch (err) {
    console.error("Error en createOrder:", err);
    return res.status(500).json({ ok: false, message: "Error al crear pedido" });
  }
}

/**
 * GET /api/orders/mine
 * Devuelve el historial de pedidos del usuario autenticado.
 */
export async function getOrdersByUser(req, res) {
  try {
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({ ok: false, message: "No autenticado" });
    }

    const orders = await Order.find({ userId })
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      ok: true,
      orders,
    });
  } catch (err) {
    console.error("Error en getOrdersByUser:", err);
    return res.status(500).json({ ok: false, message: "Error al obtener pedidos" });
  }
}
