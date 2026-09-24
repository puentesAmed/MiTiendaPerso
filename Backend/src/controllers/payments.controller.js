// controllers/payments.controller.js
import crypto from "crypto";
import axios from "axios";
import mongoose from "mongoose";
import { Order } from "../models/Order.js";
import { env } from "../config/env.js";

async function sendToDropshippingIfEnabled({ order }) {
  if (!env.DROPSHIPPING_ENABLED) return;

  const { sendToDropshipping } = await import("../services/dropshipping.service.js");
  await sendToDropshipping({ order });
}

export async function moneiWebhook(req, res) {
  if (!env.MONEI_ENABLED) {
    return res.status(503).json({ ok: false, message: "MONEI deshabilitado" });
  }

  try {
    const signature = req.headers["monei-signature"];
    const payload = JSON.stringify(req.body);

    // 🔐 Verificar firma MONEI
    const expectedSignature = crypto
      .createHmac("sha256", env.MONEI_WEBHOOK_SECRET)
      .update(payload)
      .digest("hex");

    if (signature !== expectedSignature) {
      return res.status(401).json({ ok: false, message: "Invalid signature" });
    }

    const event = req.body;

    // Solo nos importa el pago confirmado
    if (event.type !== "payment.succeeded") {
      return res.json({ ok: true });
    }

    const orderId = event.data?.orderId;
    const transactionId = event.data?.id;

    if (!orderId) {
      return res.status(400).json({ ok: false, message: "orderId missing" });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ ok: false, message: "Order not found" });
    }

    // 🟢 Marcar como pagado
    order.payment.status = "paid";
    order.payment.method = "monei";
    order.payment.transactionId = transactionId;
    order.payment.paidAt = new Date();
    order.status = "processing";

    await order.save();

    // 🚚 DROPSHIPPING (AHORA SÍ)
    await sendToDropshippingIfEnabled({ order });

    return res.json({ ok: true });
  } catch (err) {
    console.error("🔥 MONEI WEBHOOK ERROR:", err);
    return res.status(500).json({ ok: false });
  }
}


export async function createMoneiPayment(req, res) {
  try {
    const { orderId } = req.body;

    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        ok: false,
        message: "ID de pedido inválido.",
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ ok: false, message: "Order not found" });
    }

    const normalizedPaymentStatus = order.payment?.status || order.paymentStatus;
    const blockedStatuses = new Set(["cancelled", "delivered", "completed"]);

    if (normalizedPaymentStatus === "paid" || blockedStatuses.has(order.status)) {
      return res.status(409).json({
        ok: false,
        message: "Este pedido ya tiene el pago confirmado o no admite un nuevo intento de pago.",
      });
    }

    if (!env.MONEI_ENABLED) {
      return res.status(503).json({ ok: false, message: "MONEI deshabilitado" });
    }

    const response = await axios.post(
      "https://api.monei.com/v1/payments",
      {
        amount: Math.round(order.total * 100), // céntimos
        currency: "EUR",
        orderId: order._id.toString(),
        description: `Pedido ${order._id}`,
        callbackUrl: `${env.FRONTEND_URL}/order-confirmation/${order._id}`,
        completeUrl: `${env.FRONTEND_URL}/order-confirmation/${order._id}`,
        cancelUrl: `${env.FRONTEND_URL}/checkout?cancelled=true`,
        metadata: {
          orderId: order._id.toString(),
        },
      },
      {
        headers: {
          Authorization: `Bearer ${env.MONEI_API_KEY}`,
        },
      }
    );

    return res.json({
      ok: true,
      paymentUrl: response.data.nextAction.redirectUrl,
    });
  } catch (err) {
    console.error("🔥 CREATE MONEI PAYMENT ERROR:", err.response?.data || err);
    return res.status(500).json({ ok: false, message: "Payment error" });
  }
}

// ⚠️ SOLO PARA TEST / DESARROLLO
export async function markOrderAsPaidForTest(req, res) {
  try {
    const { orderId } = req.params;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ ok: false, message: "Order not found" });
    }

    if (order.payment.status === "paid") {
      return res.json({
        ok: true,
        message: "Order already paid",
        order,
      });
    }

    // 🔁 Simular pago confirmado
    order.payment.status = "paid";
    order.payment.method = "manual";
    order.payment.provider = "manual";
    order.payment.transactionId = "TEST_" + Date.now();
    order.payment.paidAt = new Date();
    order.payment.confirmedAt = order.payment.paidAt;
    order.payment.metadata = {
      ...(order.payment.metadata || {}),
      testSimulation: true,
    };
    order.paymentStatus = "paid";
    order.paymentConfirmedAt = order.payment.confirmedAt;
    order.status = "processing";

    await order.save();

    // 🚚 DROPSHIPPING (MISMO CÓDIGO QUE PRODUCCIÓN)
    await sendToDropshippingIfEnabled({ order });

    return res.json({
      ok: true,
      message: "Order marked as paid (TEST MODE)",
      order,
    });
  } catch (err) {
    console.error("🔥 TEST PAYMENT ERROR:", err);
    return res.status(500).json({ ok: false });
  }
}
