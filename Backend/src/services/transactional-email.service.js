import crypto from "node:crypto";
import { env } from "../config/env.js";
import { EmailNotification } from "../models/EmailNotification.js";
import { Order } from "../models/Order.js";
import { renderTransactionalOrderEmail } from "../emails/templates/transactionalOrderEmail.js";
import { transactionalEmailProvider } from "./resend-email-provider.js";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EVENTS = new Set([
  "ORDER_RECEIVED", "PAYMENT_PENDING", "PAYMENT_CONFIRMED", "ORDER_IN_PRODUCTION",
  "ORDER_READY_FOR_PICKUP", "ORDER_SHIPPED", "NEW_ORDER_ADMIN",
]);
function recipientFor(order, event) {
  return event === "NEW_ORDER_ADMIN" ? env.TRANSACTIONAL_EMAIL.adminEmail : order.customer?.email;
}

function safeError(error) {
  const message = String(error?.message || "email_provider_error");
  return /^(email_disabled|email_not_configured|resend_http_\d{3}|resend_missing_message_id)$/.test(message)
    ? message : "email_provider_error";
}

function logResult(event, status, orderId, providerMessageId, code) {
  const details = { orderId: String(orderId), ...(providerMessageId ? { providerMessageId } : {}), ...(code ? { code } : {}) };
  if (status === "failed") console.warn(`[email] ${event.toLowerCase()} failed`, details);
  else console.info(`[email] ${event.toLowerCase()} sent`, details);
}

export async function sendTransactionalEmail(order, event, { provider = transactionalEmailProvider, retry = false, recipientOverride = null } = {}) {
  if (!EVENTS.has(event)) throw new Error("email_event_unsupported");
  const recipient = String(recipientOverride || recipientFor(order, event) || "").trim().toLowerCase();
  if (!recipient) {
    console.warn(`[email] ${event.toLowerCase()} skipped`, { orderId: String(order._id), code: "recipient_missing" });
    return null;
  }
  const identity = { orderId: order._id, event, recipient };
  await EmailNotification.init();
  let notification;
  if (retry) {
    notification = await EmailNotification.findOneAndUpdate(
      { ...identity, status: "failed" },
      { $set: { status: "pending", lastError: null }, $inc: { attempts: 1 } },
      { new: true }
    );
    if (!notification) return EmailNotification.findOne(identity);
  } else {
    const idempotencyKey = `order-${order._id}-${event.toLowerCase()}-${crypto.createHash("sha256").update(recipient).digest("hex").slice(0, 20)}`;
    try {
      notification = await EmailNotification.create({ ...identity, idempotencyKey, status: "pending", attempts: 1 });
    } catch (error) {
      if (error?.code !== 11000) throw error;
      return EmailNotification.findOne(identity);
    }
  }

  try {
    if (!EMAIL_REGEX.test(recipient)) throw new Error("recipient_invalid");
    const replyTo = EMAIL_REGEX.test(env.TRANSACTIONAL_EMAIL.replyTo || "") ? env.TRANSACTIONAL_EMAIL.replyTo : null;
    const content = renderTransactionalOrderEmail(order, event, { replyTo });
    const result = await provider.send({ to: recipient, ...content, ...(replyTo ? { replyTo } : {}), idempotencyKey: notification.idempotencyKey });
    notification.status = "sent";
    notification.providerMessageId = result.id;
    notification.sentAt = new Date();
    notification.lastError = null;
    await notification.save();
    logResult(event, "sent", order._id, result.id);
  } catch (error) {
    const code = error?.message === "recipient_invalid" ? "recipient_invalid" : safeError(error);
    notification.status = "failed";
    notification.lastError = code;
    await notification.save();
    logResult(event, "failed", order._id, null, code);
  }
  return notification;
}

export async function sendOrderCreatedEmails(order, options) {
  for (const event of ["ORDER_RECEIVED", "PAYMENT_PENDING", "NEW_ORDER_ADMIN"]) {
    if (event === "PAYMENT_PENDING" && !["bizum", "bank_transfer"].includes(order.payment?.method)) continue;
    await sendTransactionalEmail(order, event, options)
      .catch(() => console.warn(`[email] ${event.toLowerCase()} log_unavailable`, { orderId: String(order._id) }));
  }
}

export async function retryTransactionalEmail(orderId, event, options) {
  if (!EVENTS.has(event)) throw new Error("email_event_unsupported");
  const failed = await EmailNotification.findOne({ orderId, event, status: "failed" });
  if (!failed) return null;
  const order = await Order.findById(orderId);
  if (!order) return null;
  return sendTransactionalEmail(order, event, { ...options, retry: true, recipientOverride: failed.recipient });
}
