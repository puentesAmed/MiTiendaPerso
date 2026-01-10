// controllers/orders.controller.js
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { Customization } from "../models/Customization.js";
import { generateCustomizationZip } from "../utils/generateCustomizationZip.js";
import { sendEmail } from "../services/email.service.js";
import { orderClientEmail } from "../emails/templates/orderClientEmail.js";
import { orderAdminEmail } from "../emails/templates/orderAdminEmail.js";
import { orderStatusEmail } from "../emails/templates/orderStatusEmail.js";
import { calculateEstimatedDelivery } from "../utils/calculateEstimatedDelivery.js";
import { sendToDropshipping } from "../services/dropshipping.service.js";







/**
 * 📌 CREATE ORDER — Guarda también personalizaciones avanzadas
 */
export async function createOrder(req, res) {
  console.log("🟥 BODY /api/orders", JSON.stringify(req.body, null, 2));

  console.log("📦 BODY RECIBIDO:", req.body);
  try {

    

    const userId = req.userId || null;
    //const { items, paymentMethod = "card", guestId, email: guestEmail } = req.body;

    const {
      items,     
      guestId,
      email: guestEmail,
      shippingAddress,
      billingAddress,
      notes,
      shipping,
    } = req.body;

    // ✅ Usuario O invitado (email obligatorio)
    if (!userId && (!guestId || !guestEmail)) {
      return res.status(400).json({
        ok: false,
        message: "Pedido de invitado requiere email",
      });
    }

    if (!shippingAddress) {
      return res.status(400).json({
        ok: false,
        message: "La dirección de envío es obligatoria",
      });
    }


    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ ok: false, message: "El carrito está vacío" });
    }

    const productIds = items.map((i) => i.productId);
    const products = await Product.find({
      _id: { $in: productIds },
      published: true,
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

      if (
        typeof product.stock === "number" &&
        product.stock < qty
      ) {
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
      if (cartItem.customization && cartItem.customization.type === "designer") {
        const design = cartItem.customization.design || {
          elementsBySide: { front: [], back: [] },
          notes: "",
          side: "front",
        };

        const previewImage =
          cartItem.customization.previewImageHD ||
          cartItem.customization.previewImage ||
          null;

        const previewsBySide = cartItem.customization?.previewsBySide || null;

        const record = await Customization.create({
          userId: userId || null,
          guestId: userId ? null : guestId,
          productId: product._id,
          design,
          previewImage,
          previewsBySide,
          status: "pending",
          orderId: null,
        });

        await generateCustomizationZip(record);

        customizationId = record._id;
      }

      orderItems.push({
        productId: product._id,
        name: product.name,
        price,
        quantity: qty,
        customizationId,
        selectedVariant: cartItem.selectedVariant || null,

        // NUEVO (mínimo para dropshipping)
        provider: product.provider || "local",
        externalId: product.externalId || null,
        providerSku: cartItem?.providerSku || null, // esto debe venir del front cuando seleccione variante
      });

    }

    if (total <= 0) {
      return res.status(400).json({
        ok: false,
        message: "Total de pedido inválido",
      });
    }

    if (!shipping || !shipping.estimatedDays) {
      return res.status(400).json({
        ok: false,
        message: "Información de envío no disponible",
      });
    }


    // 2️⃣ Calcular fecha estimada
    const estimatedDeliveryDate = calculateEstimatedDelivery({
      minDays: shipping.estimatedDays.min,
      maxDays: shipping.estimatedDays.max,
    });


    await Promise.all(
      orderItems.map((item) =>
        Product.updateOne(
          { _id: item.productId, stock: { $gte: item.quantity } },
          { $inc: { stock: -item.quantity } }
        )
      )
    );

    

    
    const order = await Order.create({
      userId: userId || null,
      guestId: userId ? null : guestId,
      guestEmail: userId ? null : guestEmail,
      items: orderItems,
      total,
      shippingAddress,
      billingAddress: billingAddress || null,
      notes: notes || "",

      //Logística
      status: "created",

      //Pago
      payment: {
        method: null,
        status: "pending",
      },

      shipping: {
        zone: shipping.zone,
        price: shipping.price,
        isFree: shipping.isFree,
        estimatedDays: shipping.estimatedDays,
        estimatedDeliveryDate,
        deliveryStatus: "estimated",
      }

      
    });

    // ================================
    // DROPSHIPPING (AliExpress)
    // ================================
    /*sendToDropshipping({
      order,
      items,
      shippingAddress,
    });
    */

    // 📧 Email al cliente
    try {
      await sendEmail({
        to: order.guestEmail || req.user?.email,
        subject: "Confirmación de pedido",
        html: orderClientEmail(order),
      });
    } catch (err) {
      console.warn("⚠️ Error enviando email al cliente:", err.message);
    }


    // 📧 Email al admin
    try {
      await sendEmail({
        to: process.env.ADMIN_EMAIL,
        subject: `Nuevo pedido #${order._id}`,
        html: orderAdminEmail(order),
      });
    } catch (err) {
      console.warn("⚠️ Error enviando email al admin:", err.message);
    }




    // Asociar personalizaciones al pedido
    await Customization.updateMany(
      userId
        ? { userId, orderId: null }
        : { guestId, orderId: null },
      { $set: { orderId: order._id } }
    );

    return res.status(201).json({
      ok: true,
      orderId: order._id,
      order,
    });
  } catch (err) {
    console.error("🔥 ERROR DETALLADO EN createOrder:", err);
    return res.status(500).json({
      ok: false,
      message: "Error al crear pedido",
    });
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
 * 📌 ADMIN: CONFIRMAR FECHA DE ENTREGA
 * PUT /api/admin/orders/:id/delivery
 */
export async function adminConfirmDeliveryDate(req, res) {
  try {
    const { id } = req.params;
    const { confirmedDeliveryDate } = req.body;

    if (!confirmedDeliveryDate) {
      return res.status(400).json({
        ok: false,
        message: "La fecha de entrega es obligatoria",
      });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        ok: false,
        message: "Pedido no encontrado",
      });
    }

    // 🗓️ Guardar fecha confirmada
    order.shipping.confirmedDeliveryDate = new Date(confirmedDeliveryDate);
    order.shipping.deliveryStatus = "confirmed";

    await order.save();

    // 📧 Email automático al cliente
    const emailData = orderStatusEmail(order, {
      type: "deliveryConfirmed",
    });

    if (emailData) {
      await sendEmail({
        to: order.guestEmail || order.userId?.email,
        subject: emailData.subject,
        html: emailData.html,
      });
    }

    return res.json({
      ok: true,
      message: "Fecha de entrega confirmada correctamente",
      order,
    });
  } catch (err) {
    console.error("Error en adminConfirmDeliveryDate:", err);
    return res.status(500).json({
      ok: false,
      message: "Error al confirmar fecha de entrega",
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

    const allowed = [
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ];

    if (!allowed.includes(status)) {
      return res.status(400).json({
        ok: false,
        message: "Estado no permitido",
      });
    }

    // Actualizar estado
    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ ok: false, message: "Pedido no encontrado" });
    }

    order.status = status;
    await order.save();

    // 📧 Notificar al cliente

    const emailData = orderStatusEmail(order);

    if (emailData) {
      await sendEmail({
        to: order.guestEmail || order.userId?.email,
        subject: emailData.subject,
        html: emailData.html,
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


//Pedidos

export async function trackOrderByEmail(req, res) {
  try {
    const { orderId, email } = req.query;

    if (!orderId || !email) {
      return res.status(400).json({
        ok: false,
        message: "Pedido y email son obligatorios",
      });
    }

    const order = await Order.findById(orderId).lean();

    if (!order) {
      return res.status(404).json({
        ok: false,
        message: "Pedido no encontrado",
      });
    }

    // Verificar email (usuario o invitado)
    const validEmail =
      order.guestEmail === email ||
      order.userId?.email === email;

    if (!validEmail) {
      return res.status(403).json({
        ok: false,
        message: "Datos no coinciden",
      });
    }

    return res.json({
      ok: true,
      order: {
        _id: order._id,
        status: order.status,
        total: order.total,
        createdAt: order.createdAt,
        items: order.items.map(i => ({
          name: i.name,
          quantity: i.quantity,
        })),
      },
    });
  } catch (err) {
    console.error("Error en trackOrderByEmail:", err);
    return res.status(500).json({
      ok: false,
      message: "Error al consultar pedido",
    });
  }
}
