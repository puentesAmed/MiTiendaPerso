import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { Customization } from "../models/Customization.js"; // ⬅ NUEVO
import { generateCustomizationZip } from "../utils/generateCustomizationZip.js"; // ⬅ NUEVO

/**
 * 📌 CREATE ORDER — Guarda también personalizaciones avanzadas
 */


export async function createOrder(req, res) {
  try {
    const userId = req.userId;
    const { items, paymentMethod = "card" } = req.body;

    if (!userId) {
      return res.status(401).json({ ok: false, message: "No autenticado" });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ ok: false, message: "El carrito está vacío" });
    }

    const productIds = items.map((i) => i.productId);
    const products = await Product.find({
      _id: { $in: productIds },
      active: true,
    });

    const productsMap = new Map(products.map((p) => [p._id.toString(), p]));

    const orderItems = [];
    let total = 0;

    for (const cartItem of items) {
      const { productId, quantity } = cartItem;
      const qty = Number(quantity) || 0;

      if (!productId || qty <= 0) {
        return res.status(400).json({ ok: false, message: "Línea de carrito inválida" });
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

      const price = Number(product.price);
      total += price * qty;

      let customizationId = null;

      // -------------------------------
      //     PERSONALIZACIÓN
      // -------------------------------
      if (
        cartItem.customization &&
        cartItem.customization.type === "designer"
      ) {
        const design = cartItem.customization.design || {
          elementsBySide: { front: [], back: [] },
          notes: "",
          side: "front",
        };

        // IMPORTANTE: estos valores DEBEN ser strings
        const previewImage =
          cartItem.customization.previewImageHD ||
          cartItem.customization.previewImage ||
          null;

        const mockupFront = cartItem.customization.mockupFront || null;
        const mockupBack = cartItem.customization.mockupBack || null;
        const previewsBySide = cartItem.customization?.previewsBySide || null;


        const record = await Customization.create({
          userId,
          productId: product._id,
          design,
          previewImage,   // <--- STRING (base64 PNG)
          
          previewsBySide,
          status: "pending",
          orderId: null,
        });

        // Generamos ZIP profesional
        await generateCustomizationZip(record);

        customizationId = record._id;
      }

      orderItems.push({
        productId: product._id,
        name: product.name,
        price,
        quantity: qty,
        customizationId,
      });
    }

    if (total <= 0) {
      return res.status(400).json({
        ok: false,
        message: "Total de pedido inválido",
      });
    }

    await Promise.all(
      orderItems.map((item) =>
        Product.updateOne(
          { _id: item.productId, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity } }
        )
      )
    );

    let paymentStatus = paymentMethod === "card" || paymentMethod === "paypal"
      ? "paid"
      : "pending";

    const order = await Order.create({
      userId,
      items: orderItems,
      total,
      status: "pending",
      paymentMethod,
      paymentStatus,
    });

    // Asociar customizaciones al pedido
    await Customization.updateMany(
      { userId, orderId: null },
      { $set: { orderId: order._id } }
    );

    return res.status(201).json({
      ok: true,
      orderId: order._id,
      order,
    });

  } catch (err) {
    console.error(
      "🔥 ERROR DETALLADO EN createOrder:",
      "\n📌 Mensaje:", err.message,
      "\n📌 Stack:", err.stack,
      "\n📌 Items recibidos:", req.body?.items,
      "\n📌 Error completo:", err
    );

    return res.status(500).json({
      ok: false,
      message: "Error al crear pedido",
    });
  }
}


/**
 * 📌 PEDIDOS DEL USUARIO
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

    return res.json({ ok: true, orders });
  } catch (err) {
    console.error("Error en getOrdersByUser:", err);
    return res
      .status(500)
      .json({ ok: false, message: "Error al obtener pedidos" });
  }
}

/**
 * 📌 ADMIN: LISTAR PEDIDOS
 */
export async function adminGetAllOrders(req, res) {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .populate("userId", "name email")
      .lean();

    return res.json({ ok: true, orders });
  } catch (err) {
    console.error("Error en adminGetAllOrders:", err);
    return res.status(500).json({
      ok: false,
      message: "Error al obtener pedidos",
    });
  }
}

/**
 * 📌 ADMIN: CAMBIAR ESTADO
 */
export async function adminUpdateOrderStatus(req, res) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowed = ["pending", "paid", "shipped", "delivered", "cancelled"];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        ok: false,
        message: "Estado no permitido",
      });
    }

    const order = await Order.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );

    if (!order) {
      return res.status(404).json({
        ok: false,
        message: "Pedido no encontrado",
      });
    }

    return res.json({
      ok: true,
      order,
      message: "Estado de pedido actualizado",
    });
  } catch (err) {
    console.error("Error en adminUpdateOrderStatus:", err);
    return res.status(500).json({
      ok: false,
      message: "Error al actualizar estado del pedido",
    });
  }
}
