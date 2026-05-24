/*
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
import { AffiliateProduct } from "../models/AffiliateProduct.js";
import { sendToDropshipping } from "../services/dropshipping.service.js";

console.log("🔥 ORDERS CONTROLLER ACTIVO");

/**
 * 📌 CREATE ORDER — Guarda también personalizaciones avanzadas
 */
/*
export async function createOrder(req, res) {
  console.log("🧪 CREATE ORDER CALLED");
  console.log("🧪 items count:", req.body.items?.length);
  console.log(  "🧪 has customization:", !!req.body.items?.[0]?.customization);


  
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
      total: clientTotal,
    } = req.body;

    
    let productsTotal = 0;

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
   

    const localProducts = await Product.find({
      _id: { $in: productIds },
      active: true,
    });

    const affiliateProducts = await AffiliateProduct.find({
      _id: { $in: productIds },
      enabled: true,
      readyForCheckout: true,
    });

    const productsMap = new Map([
      ...localProducts.map(p => [p._id.toString(), p]),
      ...affiliateProducts.map(p => [p._id.toString(), p]),
    ]);



    const orderItems = [];
   


    for (const cartItem of items) {

       console.log(
    "🎨 DEBUG customization:",
    {
      exists: !!cartItem.customization,
      type: cartItem.customization?.type,
      designKeys: Object.keys(cartItem.customization?.design || {}),
      hasElements:
        !!cartItem.customization?.design?.elementsBySide &&
        (
          (cartItem.customization.design.elementsBySide.front?.length || 0) +
          (cartItem.customization.design.elementsBySide.back?.length || 0)
        ) > 0
    }
  );
      const { productId, quantity } = cartItem;
      const qty = Number(quantity) || 0;

      if (!productId || qty <= 0) {
        return res.status(400).json({ ok: false, message: "Línea de carrito inválida" });
      }

      

      const product = productsMap.get(productId);

      console.log("🔍 PRODUCT RESOLVED:", {
        cartProductId: productId,
        resolvedId: product?._id?.toString(),
        provider: product?.provider,
        model: product?.constructor?.modelName,
      });


      // 👉 SI NO ES PRODUCTO LOCAL (AliExpress / afiliado)
      if (!product) {
        orderItems.push({
          productId,
          name: cartItem.name,
          price: Number(cartItem.price),
          quantity: qty,
          customizationId: null,
          selectedVariant: cartItem.selectedVariant || null,

          provider: "aliexpress",
          externalId: cartItem.externalId || productId,
          providerSku: cartItem.providerSku || null,
        });

        productsTotal += Number(cartItem.price) * qty;
        continue; // ⬅️ CRÍTICO
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


      const price = Number(cartItem.price ?? product.price);
      //total += price * qty;
      productsTotal += price * qty;

      let customizationId = null;

      // -------------------------------
      //     PERSONALIZACIÓN
      // -------------------------------
     
     console.log("🧪 cartItem.customization:", cartItem.customization);

      if (cartItem.customization) {
        console.log("🧪 customization.type:", cartItem.customization.type);
        console.log(
          "🧪 customization.design:",
          cartItem.customization.design
        );
        console.log(
          "🧪 elements front length:",
          cartItem.customization.design?.elementsBySide?.front?.length
        );
      }


       
      if (
        cartItem.customization &&
        cartItem.customization.type === "designer" &&
        cartItem.customization.design
      ) {
        console.log("🎨 Customization detected");

        const design = cartItem.customization.design;

        const previewsBySide =
          cartItem.customization.previewsBySide ||
          design.previewsBySide ||
          null;

        const previewImage =
          cartItem.customization.previewImage ||
          previewsBySide?.front ||
          previewsBySide?.back ||
          null;

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

        console.log("✅ Customization creada:", record._id);

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

    if (typeof clientTotal !== "number") {
      return res.status(400).json({
        ok: false,
        message: "Total del pedido no recibido",
      });
    }

    const shippingPrice = shipping?.price || 0;
    const calculatedTotal = productsTotal + shippingPrice;

    if (Math.abs(calculatedTotal - clientTotal) > 0.01) {
      return res.status(400).json({
        ok: false,
        message: "El total del pedido no es válido",
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


    

    console.log("📉 DESCONTANDO STOCK:", orderItems);


    await Promise.all(
      orderItems
        .filter(item => item.provider === "local")
        .map(item =>
          Product.updateOne(
            { _id: item.productId, stock: { $gte: item.quantity } },
            { $inc: { stock: -item.quantity } }
          )
        )
    );


    const finalBillingAddress = billingAddress || shippingAddress;

    console.log("🚨 ANTES DE CREAR ORDER");

    
    const order = await Order.create({
      userId: userId || null,
      guestId: userId ? null : guestId,
      guestEmail: userId ? null : guestEmail,
      items: orderItems,
      total: calculatedTotal,
      shippingAddress,
      billingAddress: finalBillingAddress,
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

    console.log("🚨 DESPUÉS DE CREAR ORDER");

    // ✅ CAMBIO MÍNIMO CRÍTICO: vincular personalizaciones al pedido recién creado
    // (sin tocar la lógica anterior, solo enlazamos por los ids usados en orderItems)
    const customizationIdsToLink = orderItems
      .map((it) => it.customizationId)
      .filter(Boolean);

    if (customizationIdsToLink.length > 0) {
      await Customization.updateMany(
        { _id: { $in: customizationIdsToLink } },
        { $set: { orderId: order._id } }
      );
    }

    // ================================
    // DROPSHIPPING (AliExpress)
    // ================================
    /*sendToDropshipping({
      order,
      items,
      shippingAddress,
    });
    */
   /*

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
   /* await Customization.updateMany(
      userId
        ? { userId, orderId: null }
        : { guestId, orderId: null },
      { $set: { orderId: order._id } }
    );*/
/*
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
/*
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
/*
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
/*
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
/*
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
/*
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
*/

// controllers/orders.controller.js
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { AffiliateProduct } from "../models/AffiliateProduct.js";
import { Customization } from "../models/Customization.js";

import { generateCustomizationZip } from "../utils/generateCustomizationZip.js";
import { calculateEstimatedDelivery } from "../utils/calculateEstimatedDelivery.js";

import { sendEmail } from "../services/email.service.js";
import { orderClientEmail } from "../emails/templates/orderClientEmail.js";
import { orderAdminEmail } from "../emails/templates/orderAdminEmail.js";
import { orderStatusEmail } from "../emails/templates/orderStatusEmail.js";

import { sendToDropshipping } from "../services/dropshipping.service.js";

console.log("🔥 ORDERS CONTROLLER ACTIVO");

/**
 * 📌 CREATE ORDER
 * - Productos locales: stock + personalización
 * - AliExpress: sin stock local, sin personalización
 */
export async function createOrder(req, res) {
  console.log("🧪 CREATE ORDER CALLED");

  try {
    const userId = req.userId || null;

    const {
      items,
      guestId,
      email: guestEmail,
      shippingAddress,
      billingAddress,
      notes,
      shipping,
      total: clientTotal,
    } = req.body;

    /* ----------------------------------------------------
     * VALIDACIONES BÁSICAS
     * ---------------------------------------------------- */
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
      return res.status(400).json({
        ok: false,
        message: "El carrito está vacío",
      });
    }

    if (!shipping || !shipping.estimatedDays) {
      return res.status(400).json({
        ok: false,
        message: "Información de envío no disponible",
      });
    }

    /* ----------------------------------------------------
     * CARGAR PRODUCTOS
     * ---------------------------------------------------- */
    const productIds = items.map(i => i.productId);

    const localProducts = await Product.find({
      _id: { $in: productIds },
      active: true,
    });

    const affiliateProducts = await AffiliateProduct.find({
      _id: { $in: productIds },
      enabled: true,
      readyForCheckout: true,
    });

    const productsMap = new Map([
      ...localProducts.map(p => [p._id.toString(), p]),
      ...affiliateProducts.map(p => [p._id.toString(), p]),
    ]);

    /* ----------------------------------------------------
     * PROCESAR ITEMS
     * ---------------------------------------------------- */
    const orderItems = [];
    let productsTotal = 0;

    for (const cartItem of items) {
      const { productId, quantity } = cartItem;
      const qty = Number(quantity) || 0;
      const provider = cartItem.provider || "local";

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
          message: `Producto no disponible (${provider})`,
        });
      }

      /* -------------------------
       * STOCK (SOLO LOCAL)
       * ------------------------- */
      if (provider === "local") {
        if (
          typeof product.stock === "number" &&
          product.stock < qty
        ) {
          return res.status(400).json({
            ok: false,
            message: `Stock insuficiente para: ${product.name}`,
          });
        }
      }

      const price = Number(cartItem.price ?? product.price);
      productsTotal += price * qty;

      /* -------------------------
       * PERSONALIZACIÓN (SOLO LOCAL)
       * ------------------------- */
      let customizationId = null;

      if (
        provider === "local" &&
        cartItem.customization?.type === "designer" &&
        cartItem.customization.design
      ) {
        const design = cartItem.customization.design;

        const previewsBySide =
          cartItem.customization.previewsBySide ||
          design.previewsBySide ||
          null;

        const previewImage =
          cartItem.customization.previewImage ||
          previewsBySide?.front ||
          previewsBySide?.back ||
          null;

        const customization = await Customization.create({
          userId: userId || null,
          guestId: userId ? null : guestId,
          productId: product._id,
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
        productId: product._id,
        name: product.name || product.title,
        price,
        quantity: qty,
        customizationId,
        selectedVariant: cartItem.selectedVariant || null,

        provider,
        externalId: provider === "aliexpress" ? product.externalId : null,
        providerSku: cartItem.providerSku || null,
      });
    }

    /* ----------------------------------------------------
     * TOTAL
     * ---------------------------------------------------- */
    if (typeof clientTotal !== "number") {
      return res.status(400).json({
        ok: false,
        message: "Total del pedido no recibido",
      });
    }

    const shippingPrice = shipping.price || 0;
    const calculatedTotal = productsTotal + shippingPrice;

    if (Math.abs(calculatedTotal - clientTotal) > 0.01) {
      return res.status(400).json({
        ok: false,
        message: "El total del pedido no es válido",
      });
    }

    /* ----------------------------------------------------
     * FECHA ESTIMADA
     * ---------------------------------------------------- */
    const estimatedDeliveryDate = calculateEstimatedDelivery({
      minDays: shipping.estimatedDays.min,
      maxDays: shipping.estimatedDays.max,
    });

    /* ----------------------------------------------------
     * DESCONTAR STOCK (SOLO LOCAL)
     * ---------------------------------------------------- */
    await Promise.all(
      orderItems
        .filter(item => item.provider === "local")
        .map(item =>
          Product.updateOne(
            { _id: item.productId, stock: { $gte: item.quantity } },
            { $inc: { stock: -item.quantity } }
          )
        )
    );

    /* ----------------------------------------------------
     * CREAR ORDER
     * ---------------------------------------------------- */
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
        method: null,
        provider: null,
        status: "pending",
        providerPaymentId: null,
        metadata: {},
      },
      paymentStatus: "pending",

      shipping: {
        zone: shipping.zone,
        price: shipping.price,
        isFree: shipping.isFree,
        estimatedDays: shipping.estimatedDays,
        estimatedDeliveryDate,
        deliveryStatus: "estimated",
      },
    });

    /* ----------------------------------------------------
     * VINCULAR PERSONALIZACIONES
     * ---------------------------------------------------- */
    const customizationIds = orderItems
      .map(i => i.customizationId)
      .filter(Boolean);

    if (customizationIds.length > 0) {
      await Customization.updateMany(
        { _id: { $in: customizationIds } },
        { $set: { orderId: order._id } }
      );
    }

    /* ----------------------------------------------------
     * EMAILS
     * ---------------------------------------------------- */
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
        subject: `Nuevo pedido #${order._id}`,
        html: orderAdminEmail(order),
      });
    } catch (err) {
      console.warn("⚠️ Error enviando email al admin:", err.message);
    }

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
