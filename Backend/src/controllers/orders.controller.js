
// controllers/orders.controller.js
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { Customization } from "../models/Customization.js";
import mongoose from "mongoose";

import { generateCustomizationZip } from "../utils/generateCustomizationZip.js";
import { storageProvider } from "../storage/index.js";
import { calculateEstimatedDelivery } from "../utils/calculateEstimatedDelivery.js";

import { sendEmail } from "../services/email.service.js";
import { orderClientEmail } from "../emails/templates/orderClientEmail.js";
import { orderAdminEmail } from "../emails/templates/orderAdminEmail.js";
import { orderStatusEmail } from "../emails/templates/orderStatusEmail.js";

import { isDesignerCustomization, normalizeCustomizationPayload } from "../utils/customizationAdapter.js";
import { createProductionCustomization, ProductionCustomizationError } from "../services/production-customization.service.js";
import {
  OrderCalculationError,
  resolveAuthoritativeOrderLines,
  roundCurrency,
} from "../services/order-calculation.service.js";
import {
  calculateSelectedShippingQuote,
  calculateShippingQuote,
  isShippingDestinationComplete,
  ShippingCalculationError,
} from "../services/shipping.service.js";
import {
  assertManualPaymentMethod,
  buildManualPaymentInstructions,
  ManualPaymentError,
} from "../services/manual-payments.service.js";
import { consumeCoupon, CouponError, releaseCoupon, validateCoupon } from "../services/coupon.service.js";
import { calculateOrderPreparation } from "../services/fulfillment.service.js";


/**
 * 📌 CREATE ORDER
 * - Producto, precio, variante, stock y envío autoritativos de backend
 * - Bizum o transferencia manual con pago inicialmente pendiente
 */
export async function createOrder(req, res) {
  const createdCustomizationIds = [];
  let orderPersisted = false;
  let consumedCouponId = null;

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
      couponCode,
      shippingMethodId,
    } = req.body;

    if (!userId && (!guestId || !guestEmail)) {
      return res.status(400).json({
        ok: false,
        message: "Pedido de invitado requiere email",
      });
    }

    if (!shippingAddress && shippingMethodId !== "pickup-free") {
      return res.status(400).json({
        ok: false,
        message: "La dirección de envío es obligatoria",
      });
    }

    const paymentDefinition = await assertManualPaymentMethod(paymentMethod);

    const { lines, subtotal, stockRequirements } =
      await resolveAuthoritativeOrderLines(items);
    const orderPreparation = calculateOrderPreparation(lines);
    const coupon = await validateCoupon({ code: couponCode, subtotal, userId, guestEmail });
    const discountedSubtotal = roundCurrency(subtotal - (coupon?.discountAmount || 0));
    const shipping = shippingMethodId
      ? await calculateSelectedShippingQuote({ authoritativeSubtotal: discountedSubtotal, shippingAddress, lines, shippingMethodId })
      : await calculateShippingQuote({ authoritativeSubtotal: discountedSubtotal, shippingAddress });
    const persistedShippingAddress = shipping.type === "PICKUP_FREE" && !isShippingDestinationComplete(shippingAddress)
      ? null
      : shippingAddress;
    const calculatedTotal = roundCurrency(discountedSubtotal + shipping.price);
    const orderId = new mongoose.Types.ObjectId();

    if (coupon?.couponId) {
      await consumeCoupon(coupon.couponId);
      consumedCouponId = coupon.couponId;
    }

    // Todas las validaciones autoritativas terminan antes de efectos laterales.
    const orderItems = [];
    for (const line of lines) {
      const orderItemId = new mongoose.Types.ObjectId();
      let customizationId = null;
      const normalizedCustomization = normalizeCustomizationPayload(
        line.customization
      );

      if (
        line.product.customizable &&
        isDesignerCustomization(normalizedCustomization) &&
        normalizedCustomization.schemaVersion === 2
      ) {
        const customization = await createProductionCustomization({
          owner: { userId: userId || null, guestId: userId ? null : guestId },
          product: line.product,
          line,
          payload: normalizedCustomization,
          orderId,
          orderItemId,
        });
        customizationId = customization._id;
        createdCustomizationIds.push(customization._id);
      } else if (
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
          orderId,
        });

        try {
          await generateCustomizationZip(customization);
        } catch (error) {
          await Customization.deleteOne({ _id: customization._id }).catch(() => {});
          throw error;
        }
        customizationId = customization._id;
        createdCustomizationIds.push(customization._id);
      }

      orderItems.push({
        _id: orderItemId,
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

    const estimatedDeliveryDate = shipping.estimatedDays
      ? calculateEstimatedDelivery({ minDays: shipping.estimatedDays.min, maxDays: shipping.estimatedDays.max })
      : null;

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
        await releaseCoupon(consumedCouponId);
        consumedCouponId = null;
        return res.status(409).json({
          ok: false,
          message: "El stock ha cambiado. Revisa el carrito e inténtalo de nuevo.",
        });
      }
    }

    const order = await Order.create({
      _id: orderId,
      userId: userId || null,
      guestId: userId ? null : guestId,
      guestEmail: userId ? null : guestEmail,
      items: orderItems,
      subtotal,
      discountAmount: coupon?.discountAmount || 0,
      coupon: coupon ? { code: coupon.code, type: coupon.type, value: coupon.value, discountAmount: coupon.discountAmount } : null,
      total: calculatedTotal,
      shippingAddress: persistedShippingAddress,
      billingAddress: billingAddress || persistedShippingAddress,
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
        instructionsSnapshot: paymentDefinition,
      },
      paymentStatus: "pending",
      paymentConfirmedAt: null,
      shipping: {
        methodId: shipping.methodId || "legacy-zone",
        label: shipping.label || "Envío estándar",
        type: shipping.type || "LEGACY_ZONE",
        serviceLevel: shipping.serviceLevel || "standard",
        quoteSource: shipping.quoteSource || shipping.source || "zone",
        currency: shipping.currency || "EUR",
        pickupAddress: shipping.pickupAddress || null,
        instructions: shipping.instructions || null,
        availabilityText: shipping.availabilityText || null,
        distanceKm: shipping.distanceKm ?? null,
        band: shipping.band || null,
        normalizedDestination: shipping.normalizedDestination || null,
        providerId: shipping.providerId || null,
        serviceId: shipping.serviceId || null,
        parcels: shipping.parcels,
        zone: shipping.zone,
        price: shipping.price,
        amount: shipping.price,
        isFree: shipping.isFree,
        estimatedDays: shipping.estimatedDays,
        estimatedDeliveryDate,
        deliveryStatus: "estimated",
      },
      orderPreparation,
    });
    orderPersisted = true;

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
      paymentInstructions: await buildManualPaymentInstructions(order),
    });
  } catch (err) {
    if (!orderPersisted && consumedCouponId) {
      await releaseCoupon(consumedCouponId).catch(() => {});
    }
    if (!orderPersisted && createdCustomizationIds.length > 0) {
      await Promise.all(
        createdCustomizationIds.map(async (id) => {
          const customization = await Customization.findById(id).lean().catch(() => null);
          const artifactKeys = customization?.schemaVersion === 2
            ? [
                customization.productionBundle?.zipStorageKey,
                customization.productionBundle?.manifestStorageKey,
                ...(customization.productionSurfaces || []).flatMap((surface) => [surface.artwork?.storageKey, surface.preview?.storageKey, surface.placementProof?.storageKey, surface.placementMetadata?.storageKey]),
                ...Object.values(customization.designDocument?.assets || {}).map((asset) => asset.storageKey),
              ].filter(Boolean)
            : [`customizations/${id}.zip`];
          await Promise.all(artifactKeys.map((key) => storageProvider.delete(key).catch(() => {})));
          await Customization.deleteOne({ _id: id }).catch(() => {});
        })
      );
    }

    if (
      err instanceof OrderCalculationError ||
      err instanceof ShippingCalculationError ||
      err instanceof ManualPaymentError ||
      err instanceof CouponError ||
      err instanceof ProductionCustomizationError
    ) {
      return res.status(err.status || 400).json({
        ok: false,
        message: err.message,
      });
    }

    console.error("Error en createOrder:", err.message);
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

function summarizeCustomization(customization) {
  if (!customization || typeof customization !== "object") return null;

  if (customization.schemaVersion === 2) {
    return {
      schemaVersion: 2,
      previewImage: customization.previewImage || null,
      textSummary: [],
      notes: null,
    };
  }

  const elementsBySide = customization.design?.elementsBySide || {};
  const textSummary = [
    ...(Array.isArray(elementsBySide.front) ? elementsBySide.front : []),
    ...(Array.isArray(elementsBySide.back) ? elementsBySide.back : []),
  ]
    .filter((element) => element?.type === "text" && element.text?.trim())
    .map((element) => element.text.trim())
    .slice(0, 2);

  return {
    previewImage:
      customization.previewImage ||
      customization.previewsBySide?.front ||
      customization.previewsBySide?.back ||
      null,
    textSummary,
    notes: customization.design?.notes?.trim() || null,
  };
}

export async function getOrderByIdForUser(req, res) {
  try {
    const { id } = req.params;
    const userId = req.userId;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ ok: false, message: "ID de pedido inválido" });
    }

    const order = await Order.findOne({ _id: id, userId })
      .populate({
        path: "items.customizationId",
        select: "schemaVersion previewImage previewsBySide design.elementsBySide design.notes",
      })
      .lean();

    if (!order) {
      return res.status(404).json({ ok: false, message: "Pedido no encontrado" });
    }

    const items = order.items.map((item) => {
      const customizationDocument =
        item.customizationId && typeof item.customizationId === "object"
          ? item.customizationId
          : null;

      return {
        ...item,
        customizationId: customizationDocument?._id || item.customizationId || null,
        customization: summarizeCustomization(customizationDocument),
      };
    });

    const paymentStatus = order.payment?.status || order.paymentStatus;
    const paymentMethod = order.payment?.method || order.paymentMethod;
    const canShowInstructions =
      paymentStatus === "pending" &&
      ["bizum", "bank_transfer"].includes(paymentMethod);

    let paymentInstructions = null;
    if (canShowInstructions) {
      try {
        paymentInstructions = await buildManualPaymentInstructions(order);
      } catch (error) {
        if (!(error instanceof ManualPaymentError)) throw error;
      }
    }

    const shippingPrice = Number(order.shipping?.price) || 0;
    const total = Number(order.total) || 0;

    return res.json({
      ok: true,
      order: { ...order, items },
      summary: {
        subtotal: Number(order.subtotal) || roundCurrency(Math.max(0, total - shippingPrice)),
        ...(order.coupon ? {
          discountAmount: Number(order.discountAmount) || 0,
          coupon: order.coupon,
        } : {}),
        shipping: shippingPrice,
        total,
      },
      paymentInstructions,
    });
  } catch (err) {
    console.error("Error en getOrderByIdForUser:", err);
    return res.status(500).json({ ok: false, message: "Error al obtener pedido" });
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
      try {
        await sendEmail({
          to: order.guestEmail || order.userId?.email,
          subject: emailData.subject,
          html: emailData.html,
        });
      } catch (emailError) {
        console.warn(
          "Fecha confirmada, pero no se pudo enviar su notificación:",
          emailError.message
        );
      }
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
      try {
        await sendEmail({
          to: order.guestEmail || order.userId?.email,
          subject: emailData.subject,
          html: emailData.html,
        });
      } catch (emailError) {
        console.warn(
          "Estado actualizado, pero no se pudo enviar su notificación:",
          emailError.message
        );
      }
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
