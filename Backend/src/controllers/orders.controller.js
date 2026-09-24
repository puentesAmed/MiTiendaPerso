
// controllers/orders.controller.js
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { Customization } from "../models/Customization.js";

import { generateCustomizationZip } from "../utils/generateCustomizationZip.js";
import { calculateEstimatedDelivery } from "../utils/calculateEstimatedDelivery.js";

import { sendEmail } from "../services/email.service.js";
import { orderClientEmail } from "../emails/templates/orderClientEmail.js";
import { orderAdminEmail } from "../emails/templates/orderAdminEmail.js";
import { orderStatusEmail } from "../emails/templates/orderStatusEmail.js";

import { isDesignerCustomization, normalizeCustomizationPayload } from "../utils/customizationAdapter.js";
import {
  OrderCalculationError,
  resolveAuthoritativeOrderLines,
  roundCurrency,
} from "../services/order-calculation.service.js";
import {
  calculateShippingQuote,
  ShippingCalculationError,
} from "../services/shipping.service.js";
import {
  assertManualPaymentMethod,
  buildManualPaymentInstructions,
  ManualPaymentError,
} from "../services/manual-payments.service.js";

console.log("🔥 ORDERS CONTROLLER ACTIVO");

/**
 * 📌 CREATE ORDER
 * - Producto, precio, variante, stock y envío autoritativos de backend
 * - Bizum o transferencia manual con pago inicialmente pendiente
 */
export async function createOrder(req, res) {
  try {
    const userId = req.userId || null;
    const {
      items,
      paymentMethod,
      guestId,
      email: guestEmail,
      shippingAddress,
      billingAddress,
      notes,
    } = req.body;

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

    assertManualPaymentMethod(paymentMethod);

    const { lines, subtotal, stockRequirements } =
      await resolveAuthoritativeOrderLines(items);
    const shipping = calculateShippingQuote({
      authoritativeSubtotal: subtotal,
      shippingAddress,
    });
    const calculatedTotal = roundCurrency(subtotal + shipping.price);

    // Todas las validaciones autoritativas terminan antes de efectos laterales.
    const orderItems = [];
    for (const line of lines) {
      let customizationId = null;
      const normalizedCustomization = normalizeCustomizationPayload(
        line.customization
      );

      if (
        line.product.customizable &&
        isDesignerCustomization(normalizedCustomization) &&
        normalizedCustomization.design
      ) {
        const design = normalizedCustomization.design;
        const previewsBySide =
          normalizedCustomization.previewsBySide ||
          design.previewsBySide ||
          null;
        const previewImage =
          normalizedCustomization.previewImage ||
          previewsBySide?.front ||
          previewsBySide?.back ||
          null;

        const customization = await Customization.create({
          userId: userId || null,
          guestId: userId ? null : guestId,
          productId: line.productId,
          design,
          previewImage,
          previewsBySide,
          status: "pending",
          orderId: null,
        });

        await generateCustomizationZip(customization);
        customizationId = customization._id;
      }

      orderItems.push({
        productId: line.productId,
        name: line.name,
        price: line.price,
        quantity: line.quantity,
        customizationId,
        variant: line.variant,
        selectedVariant: line.variant,
        provider: "local",
        externalId: null,
        providerSku: null,
      });
    }

    const estimatedDeliveryDate = calculateEstimatedDelivery({
      minDays: shipping.estimatedDays.min,
      maxDays: shipping.estimatedDays.max,
    });

    for (const requirement of stockRequirements) {
      const stockResult = await Product.updateOne(
        {
          _id: requirement.productId,
          active: true,
          stock: { $gte: requirement.quantity },
        },
        { $inc: { stock: -requirement.quantity } }
      );

      if (stockResult.modifiedCount !== 1) {
        return res.status(409).json({
          ok: false,
          message: "El stock ha cambiado. Revisa el carrito e inténtalo de nuevo.",
        });
      }
    }

    const order = await Order.create({
      userId: userId || null,
      guestId: userId ? null : guestId,
      guestEmail: userId ? null : guestEmail,
      items: orderItems,
      total: calculatedTotal,
      shippingAddress,
      billingAddress: billingAddress || shippingAddress,
      notes: notes || "",
      status: "created",
      payment: {
        method: paymentMethod,
        provider: "manual",
        status: "pending",
        confirmedAt: null,
        confirmedBy: null,
        providerPaymentId: null,
        metadata: {},
        paidAt: null,
      },
      paymentStatus: "pending",
      paymentConfirmedAt: null,
      shipping: {
        zone: shipping.zone,
        price: shipping.price,
        isFree: shipping.isFree,
        estimatedDays: shipping.estimatedDays,
        estimatedDeliveryDate,
        deliveryStatus: "estimated",
      },
    });

    const customizationIds = orderItems
      .map((item) => item.customizationId)
      .filter(Boolean);

    if (customizationIds.length > 0) {
      await Customization.updateMany(
        { _id: { $in: customizationIds } },
        { $set: { orderId: order._id } }
      );
    }

    try {
      await sendEmail({
        to: order.guestEmail || req.user?.email,
        subject: "Confirmación de pedido",
        html: orderClientEmail(order),
      });
    } catch (err) {
      console.warn("⚠️ Error enviando email al cliente:", err.message);
    }

    try {
      await sendEmail({
        to: process.env.ADMIN_EMAIL,
        subject: "Nuevo pedido #" + order._id,
        html: orderAdminEmail(order),
      });
    } catch (err) {
      console.warn("⚠️ Error enviando email al admin:", err.message);
    }

    return res.status(201).json({
      ok: true,
      orderId: order._id,
      order,
      paymentInstructions: buildManualPaymentInstructions(order),
    });
  } catch (err) {
    if (
      err instanceof OrderCalculationError ||
      err instanceof ShippingCalculationError ||
      err instanceof ManualPaymentError
    ) {
      return res.status(err.status || 400).json({
        ok: false,
        message: err.message,
      });
    }

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


/**
 * 🧪 TEST — Marcar pedido como pagado y enviar a dropshipping
 * (Simula webhook de MONEI)
 */

export async function markOrderAsPaid(req, res) {
  try {
    const { id } = req.params;

    // 1️⃣ Buscar pedido
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        ok: false,
        message: "Pedido no encontrado",
      });
    }

    if (order.status === "cancelled") {
      return res.status(409).json({
        ok: false,
        message: "No se puede confirmar el pago de un pedido cancelado.",
      });
    }

    const currentPaymentStatus = order.payment?.status || order.paymentStatus;
    if (currentPaymentStatus === "paid") {
      return res.status(409).json({
        ok: false,
        message: "El pedido ya está marcado como pagado.",
      });
    }

    // 2️⃣ Marcar pago como realizado (sin cambiar estado operativo)
    order.payment = order.payment || {};
    order.payment.status = "paid";
    order.payment.method = order.payment.method || "manual";
    order.payment.provider = "manual";
    order.payment.paidAt = new Date();
    order.payment.confirmedAt = new Date();
    order.payment.confirmedBy = req.user?.id || null;
    order.payment.providerPaymentId = null;
    order.payment.metadata = {
      ...(order.payment.metadata || {}),
      manualConfirmation: true,
    };

    // Compatibilidad legacy
    order.paymentStatus = "paid";
    order.paymentConfirmedAt = order.payment.confirmedAt;

    await order.save();

    return res.json({
      ok: true,
      message: "Pago confirmado manualmente",
    });
  } catch (err) {
    console.error("🔥 Error en markOrderAsPaid:", err);
    return res.status(500).json({
      ok: false,
      message: "Error interno al marcar pedido como pagado",
    });
  }
}
