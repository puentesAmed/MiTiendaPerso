// controllers/payments.controller.js
import crypto from "crypto";
import axios from "axios";
import { Order } from "../models/Order.js";
import { sendToDropshipping } from "../services/dropshipping.service.js";

export async function moneiWebhook(req, res) {
  try {
    const signature = req.headers["monei-signature"];
    const payload = JSON.stringify(req.body);

    // 🔐 Verificar firma MONEI
    const expectedSignature = crypto
      .createHmac("sha256", process.env.MONEI_WEBHOOK_SECRET)
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
    await sendToDropshipping({ order });

    return res.json({ ok: true });
  } catch (err) {
    console.error("🔥 MONEI WEBHOOK ERROR:", err);
    return res.status(500).json({ ok: false });
  }
}


export async function createMoneiPayment(req, res) {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ ok: false, message: "orderId required" });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ ok: false, message: "Order not found" });
    }

    const response = await axios.post(
      "https://api.monei.com/v1/payments",
      {
        amount: Math.round(order.total * 100), // céntimos
        currency: "EUR",
        orderId: order._id.toString(),
        description: `Pedido ${order._id}`,
        callbackUrl: `${process.env.FRONTEND_URL}/order-confirmation/${order._id}`,
        completeUrl: `${process.env.FRONTEND_URL}/order-confirmation/${order._id}`,
        cancelUrl: `${process.env.FRONTEND_URL}/checkout?cancelled=true`,
        metadata: {
          orderId: order._id.toString(),
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.MONEI_API_KEY}`,
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