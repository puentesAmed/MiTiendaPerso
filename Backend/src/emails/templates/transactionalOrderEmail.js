import {
  deliveryLines, money, orderProductRows, orderSummaryLines, paymentLines, preparationLines,
  renderDelivery, renderDetailSection, renderEmailLayout, renderMoneySummary, renderOrderMeta,
  renderPaymentPending, renderProducts, renderTotalHighlight,
} from "../components/orderEmailParts.js";
import { displayOrderNumber } from "../../services/order-number.service.js";

const EVENT_TITLES = Object.freeze({
  ORDER_RECEIVED: "Pedido recibido",
  PAYMENT_PENDING: "Pago pendiente",
  PAYMENT_CONFIRMED: "Pago confirmado",
  ORDER_IN_PRODUCTION: "Pedido en producción",
  ORDER_READY_FOR_PICKUP: "Pedido listo para recoger",
  ORDER_SHIPPED: "Pedido enviado",
  NEW_ORDER_ADMIN: "Nuevo pedido",
});

const textSection = (heading, lines) => lines.length ? [heading, ...lines].join("\n") : "";
const pickupOrder = (order) => order.shipping?.type === "PICKUP_FREE" || order.shipping?.methodId === "pickup-free";

function detailedContent(order, event) {
  const preparation = preparationLines(order);
  const payment = paymentLines(order, { instructions: event === "PAYMENT_PENDING" });
  const delivery = deliveryLines(order);
  const pending = event === "PAYMENT_PENDING";
  return {
    html: pending
      ? [renderOrderMeta(order), renderTotalHighlight(order), renderPaymentPending(order), renderProducts(order), renderDelivery(order)].join("")
      : [renderOrderMeta(order), renderProducts(order), renderMoneySummary(order), renderDetailSection("Preparación", preparation), renderDelivery(order), renderDetailSection("Pago", payment)].join(""),
    text: [
      textSection("Pedido", [displayOrderNumber(order), order.createdAt ? new Date(order.createdAt).toLocaleDateString("es-ES") : ""]),
      ...(pending ? [`Importe: ${money(order.total)}`, textSection("Pago pendiente", payment)] : []),
      textSection("Productos", orderSummaryLines(order)),
      ...(!pending ? [textSection("Resumen", [
        `Subtotal: ${money(order.subtotal)}`, `Descuento: ${money(order.discountAmount)}`,
        `Envío: ${money(order.shipping?.price)}`, `Total: ${money(order.total)}`,
      ]), textSection("Preparación", preparation), textSection("Pago", payment)] : []),
      textSection("Entrega", delivery),
    ].filter(Boolean).join("\n\n"),
  };
}

function statusContent(order, event) {
  const nextStep = {
    PAYMENT_CONFIRMED: "Siguiente paso: prepararemos tu pedido.",
    ORDER_IN_PRODUCTION: "Siguiente paso: te avisaremos cuando avance la entrega.",
    ORDER_READY_FOR_PICKUP: "Ya puedes recoger tu pedido en el punto indicado.",
    ORDER_SHIPPED: "Tu pedido está en camino.",
  }[event];
  const delivery = ["ORDER_READY_FOR_PICKUP", "ORDER_SHIPPED"].includes(event) ? deliveryLines(order) : [];
  return {
    html: [renderOrderMeta(order), renderDetailSection("Siguiente paso", [nextStep]), renderTotalHighlight(order), delivery.length ? renderDelivery(order) : ""].join(""),
    text: [textSection("Pedido", [displayOrderNumber(order)]), `Total: ${money(order.total)}`, textSection("Siguiente paso", [nextStep]), textSection("Entrega", delivery)].filter(Boolean).join("\n\n"),
  };
}

function adminContent(order) {
  const keyFacts = [`Total: ${money(order.total)}`, `Entrega: ${order.shipping?.label || (pickupOrder(order) ? "Recogida gratuita" : "Envío")}`, `Pago: ${paymentLines(order)[0]}`];
  const customer = [order.customer?.fullName, order.customer?.email, order.customer?.phone].filter(Boolean);
  const personalization = orderProductRows(order).filter((item) => item.designNumber)
    .map((item) => `${item.name} · Diseño ${item.designNumber}${item.surfaces.length ? ` · ${item.surfaces.join(" · ")}` : ""}`);
  return {
    html: [renderOrderMeta(order), renderTotalHighlight(order), renderDetailSection("Cliente", customer), renderDelivery(order), renderDetailSection("Pago", paymentLines(order)), renderProducts(order), renderDetailSection("Personalizaciones", personalization)].join(""),
    text: [textSection("Pedido", [displayOrderNumber(order)]), textSection("Datos clave", keyFacts), textSection("Cliente", customer), textSection("Productos", orderSummaryLines(order))].join("\n\n"),
  };
}

export function renderTransactionalOrderEmail(order, event, { publicStorefrontUrl, replyTo } = {}) {
  const title = EVENT_TITLES[event];
  if (!title) throw new Error("email_event_unsupported");
  const admin = event === "NEW_ORDER_ADMIN";
  const name = order.customer?.fullName || "cliente";
  const greetings = {
    ORDER_RECEIVED: `Hola, ${name}. Hemos recibido tu pedido y ya está registrado correctamente.`,
    PAYMENT_PENDING: `Hola, ${name}. Tu pedido está registrado y el pago manual sigue pendiente.`,
    PAYMENT_CONFIRMED: `Hola, ${name}. Hemos confirmado el pago de tu pedido.`,
    ORDER_IN_PRODUCTION: `Hola, ${name}. Tu pedido ya está en producción.`,
    ORDER_READY_FOR_PICKUP: `Hola, ${name}. Tu pedido está listo para recoger.`,
    ORDER_SHIPPED: `Hola, ${name}. Hemos enviado tu pedido.`,
    NEW_ORDER_ADMIN: `Pedido ${displayOrderNumber(order)} · ${money(order.total)}.`,
  };
  const content = admin ? adminContent(order)
    : ["ORDER_RECEIVED", "PAYMENT_PENDING"].includes(event) ? detailedContent(order, event)
      : statusContent(order, event);
  const closing = admin ? "Revisa el pedido en Administración."
    : event === "ORDER_RECEIVED" && pickupOrder(order) ? "Te avisaremos cuando esté listo para recoger."
      : "Te avisaremos cuando cambie el estado de tu pedido.";
  return {
    subject: `${title} · ${displayOrderNumber(order)} · MiLuGui`,
    ...renderEmailLayout({ title, greeting: greetings[event], contentHtml: content.html, contentText: content.text, closing, orderNumber: displayOrderNumber(order), publicStorefrontUrl, replyTo }),
  };
}
