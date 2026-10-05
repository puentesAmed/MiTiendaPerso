import { getOrderItemVariant } from "../../utils/orderVariantAdapter.js";
import { PRODUCTION_TEMPLATES } from "../../production/template-catalog.js";
import { env } from "../../config/env.js";
import { displayOrderNumber } from "../../services/order-number.service.js";

export const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[character]);

export const money = (value) => `${Number(value || 0).toFixed(2).replace(".", ",")} €`;
const line = (label, value) => value ? `${label}: ${value}` : "";
const SURFACE_LABELS = new Map(Object.values(PRODUCTION_TEMPLATES)
  .flatMap((template) => template.surfaces.map(({ surfaceId, label }) => [surfaceId, label])));

export function getEmailLogoUrl(publicStorefrontUrl = env.PUBLIC_STOREFRONT_URL) {
  try {
    const base = new URL(publicStorefrontUrl);
    if (base.protocol !== "https:" || base.username || base.password || /(^|\.)localhost(?:\.|$)|\.local$|^127\.|^10\.|^192\.168\.|^172\.(?:1[6-9]|2\d|3[01])\.|^169\.254\.|^0\.0\.0\.0$|^\[::1\]$/i.test(base.hostname)) return null;
    return new URL("/brand/milugui-logo-email.png", base).href;
  } catch { return null; }
}

export function commercialSurfaceLabels(item) {
  const priced = Array.isArray(item.customizationPricing?.selectedSurfaces)
    ? item.customizationPricing.selectedSurfaces : [];
  const selection = priced.length ? priced : (item.selectedSurfaceIds || []).map((surfaceId) => ({ surfaceId }));
  return [...new Set(selection.map((surface) => (surface.label && surface.label !== surface.surfaceId ? surface.label : null)
    || SURFACE_LABELS.get(surface.surfaceId)).filter(Boolean))];
}

export function addressText(address) {
  if (!address) return "";
  return [address.street, `${address.postalCode || ""} ${address.city || ""}`.trim(), address.state, address.country].filter(Boolean).join(", ");
}

export function orderProductRows(order) {
  const designCounts = new Map();
  return (order.items || []).map((item) => {
    const customized = Boolean(item.customizationId);
    const productKey = String(item.productId || item.name);
    const designNumber = (designCounts.get(productKey) || 0) + 1;
    if (customized) designCounts.set(productKey, designNumber);
    return {
      name: String(item.name || "Producto"),
      quantity: Number(item.quantity || 0),
      unitPrice: Number(item.price || 0),
      linePrice: Number(item.price || 0) * Number(item.quantity || 0),
      variant: getOrderItemVariant(item),
      surfaces: customized ? commercialSurfaceLabels(item) : [],
      designNumber: customized ? designNumber : null,
    };
  });
}

export function orderSummaryLines(order) {
  return orderProductRows(order).map((item) => [
    item.name,
    line("Talla", item.variant?.size), line("Color", item.variant?.color),
    item.designNumber ? `Personalización: Diseño ${item.designNumber}` : "",
    item.surfaces.length ? `Superficies: ${item.surfaces.join(", ")}` : "",
    `Cantidad: ${item.quantity} · ${money(item.unitPrice)} × ${item.quantity} = ${money(item.linePrice)}`,
  ].filter(Boolean).join("\n"));
}

export function deliveryLines(order) {
  const shipping = order.shipping || {};
  const pickup = shipping.type === "PICKUP_FREE" || shipping.methodId === "pickup-free";
  return [
    shipping.label || (pickup ? "Recogida gratuita" : "Envío"),
    pickup ? line("Punto de recogida", shipping.pickupAddress) : line("Dirección de entrega", addressText(order.shippingAddress)),
    pickup ? line("Instrucciones", shipping.instructions) : "",
    !pickup && shipping.trackingNumber ? line("Seguimiento", shipping.trackingNumber) : "",
    shipping.estimatedDays?.min != null && shipping.estimatedDays?.max != null
      ? `Entrega estimada: ${shipping.estimatedDays.min}–${shipping.estimatedDays.max} días` : "",
  ].filter(Boolean);
}

export function paymentLines(order, { instructions = false } = {}) {
  const method = order.payment?.method;
  const snapshot = order.payment?.instructionsSnapshot || {};
  const methodLabel = { bizum: "Bizum", bank_transfer: "Transferencia bancaria" }[method] || method || "No especificado";
  return [
    methodLabel,
    order.payment?.status === "paid" ? "Pago confirmado" : "Pendiente de pago",
    instructions && method === "bizum" ? line("Destinatario", snapshot.recipient) : "",
    instructions && method === "bank_transfer" ? line("Titular", snapshot.accountHolder) : "",
    instructions && method === "bank_transfer" ? line("IBAN", snapshot.iban) : "",
    instructions ? line("Instrucciones", snapshot.instructions) : "",
    instructions ? `Referencia: ${displayOrderNumber(order)}` : "",
  ].filter(Boolean);
}

export function preparationLines(order) {
  const preparation = order.orderPreparation || {};
  if (!preparation.preparationRequired) return [];
  if (preparation.minDays != null && preparation.maxDays != null) return [`${preparation.minDays}–${preparation.maxDays} días`];
  return ["Pendiente de confirmación"];
}

const cell = (content, style = "") => `<td style="${style}">${content}</td>`;
const row = (content) => `<tr>${content}</tr>`;
const section = (content, extraStyle = "") => row(cell(content, `padding:18px 26px;${extraStyle}`));
const smallHeading = (heading) => `<h2 style="margin:0 0 12px;font-size:17px;line-height:1.3;color:#242424;font-weight:700">${escapeHtml(heading)}</h2>`;
const paragraph = (value) => `<p style="margin:5px 0;font-size:14px;line-height:1.55;overflow-wrap:anywhere;color:#444">${escapeHtml(value)}</p>`;

export function renderOrderMeta(order) {
  const date = order.createdAt ? new Date(order.createdAt).toLocaleDateString("es-ES") : "";
  return section(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7faf9;border:1px solid #e3eeeb"><tr>${cell(`<span style="display:block;font-size:12px;color:#66736f">Pedido</span><strong style="display:block;margin-top:4px;font-size:17px;color:#242424;overflow-wrap:anywhere">${escapeHtml(displayOrderNumber(order))}</strong>`, "width:62%;padding:13px;vertical-align:top;")}${cell(`<span style="display:block;font-size:12px;color:#66736f">Fecha</span><strong style="display:block;margin-top:4px;font-size:14px;color:#242424">${escapeHtml(date)}</strong>`, "padding:13px;vertical-align:top;")}</tr></table>`);
}

export function renderProducts(order) {
  const products = orderProductRows(order).map((item) => {
    const details = [line("Talla", item.variant?.size), line("Color", item.variant?.color), `Cantidad: ${item.quantity}`].filter(Boolean).map(paragraph).join("");
    const personalization = item.designNumber ? `<div style="margin-top:12px;padding:13px;background:#eef9f6;border-left:3px solid #52aa9c;border-radius:4px"><strong style="display:block;font-size:13px;color:#285e56">Personalización</strong><span style="display:block;margin-top:4px;font-size:14px;color:#242424">Diseño ${item.designNumber}</span>${item.surfaces.length ? `<span style="display:block;margin-top:9px;font-size:12px;color:#66736f">Superficies</span><span style="display:block;margin-top:3px;font-size:14px;color:#242424">${escapeHtml(item.surfaces.join(" · "))}</span>` : ""}</div>` : "";
    return row(cell(`<strong style="display:block;font-size:15px;line-height:1.4;color:#242424">${escapeHtml(item.name)}</strong>${details}${personalization}<p style="margin:11px 0 0;font-size:13px;color:#66736f">Precio: ${escapeHtml(money(item.unitPrice))} × ${item.quantity}</p>`, "padding:15px 0;vertical-align:top;border-bottom:1px solid #edf0ee;") + cell(`<strong style="font-size:15px;color:#242424;white-space:nowrap">${escapeHtml(money(item.linePrice))}</strong>`, "padding:15px 0 15px 12px;border-bottom:1px solid #edf0ee;text-align:right;vertical-align:top;"));
  }).join("");
  return section(`${smallHeading("Productos")}<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${products}</table>`);
}

export function renderMoneySummary(order) {
  const amounts = [["Subtotal", order.subtotal], ["Descuento", order.discountAmount], ["Envío", order.shipping?.price]];
  const rows = amounts.map(([label, amount]) => row(cell(escapeHtml(label), "padding:4px 0;color:#57534e;font-size:14px;") + cell(escapeHtml(money(amount)), "padding:4px 0;text-align:right;color:#57534e;font-size:14px;"))).join("");
  return section(`${smallHeading("Resumen")}<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}${row(cell("<strong>Total</strong>", "padding:14px 0 0;border-top:1px solid #c9ded9;font-size:17px;color:#242424;") + cell(`<strong>${escapeHtml(money(order.total))}</strong>`, "padding:14px 0 0;border-top:1px solid #c9ded9;text-align:right;font-size:22px;color:#285e56;"))}</table>`);
}

export function renderDetailSection(heading, lines) {
  if (!lines?.length) return "";
  return section(`${smallHeading(heading)}${lines.map(paragraph).join("")}`);
}

export function renderDelivery(order) {
  const shipping = order.shipping || {};
  const pickup = shipping.type === "PICKUP_FREE" || shipping.methodId === "pickup-free";
  const label = shipping.label || (pickup ? "Recogida gratuita" : "Envío");
  const location = pickup ? shipping.pickupAddress : addressText(order.shippingAddress);
  const estimate = shipping.estimatedDays?.min != null && shipping.estimatedDays?.max != null
    ? paragraph(`Entrega estimada: ${shipping.estimatedDays.min}–${shipping.estimatedDays.max} días`) : "";
  return section(`${smallHeading("Entrega")}${paragraph(label)}${location ? `<p style="margin:12px 0 3px;font-size:12px;color:#66736f">${pickup ? "Punto de recogida" : "Dirección de entrega"}</p>${paragraph(location)}` : ""}${shipping.instructions && pickup ? paragraph(shipping.instructions) : ""}${!pickup && shipping.trackingNumber ? paragraph(`Seguimiento: ${shipping.trackingNumber}`) : ""}${estimate}`);
}

export function renderTotalHighlight(order) {
  return section(`<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${cell("Total del pedido", "font-size:14px;color:#57534e;")}${cell(`<strong>${escapeHtml(money(order.total))}</strong>`, "text-align:right;font-size:20px;color:#285e56;")}</tr></table>`);
}

export function renderPaymentPending(order) {
  const snapshot = order.payment?.instructionsSnapshot || {};
  const method = order.payment?.method;
  const fields = [
    ["Importe", money(order.total)],
    [method === "bizum" ? "Enviar a" : "Titular", method === "bizum" ? snapshot.recipient : snapshot.accountHolder],
    ...(method === "bank_transfer" ? [["IBAN", snapshot.iban]] : []),
    ["Concepto", displayOrderNumber(order)],
    ["Instrucciones", snapshot.instructions || (method === "bizum" ? "Realiza el Bizum indicando como concepto el número de pedido." : "Indica el número de pedido como referencia del pago.")],
  ].filter(([, value]) => value).map(([label, value]) => `<tr>${cell(escapeHtml(label), "padding:6px 12px 6px 0;vertical-align:top;font-size:12px;color:#66736f;")}${cell(`<strong style="font-size:14px;color:#242424;font-weight:600;overflow-wrap:anywhere">${escapeHtml(value)}</strong>`, "padding:6px 0;vertical-align:top;")}</tr>`).join("");
  return section(`<div style="padding:16px;background:#eef9f6;border:1px solid #c9e5de;border-left:4px solid #52aa9c">${smallHeading("Pago pendiente")}<strong style="display:block;margin-bottom:10px;font-size:16px;color:#242424">${escapeHtml(method === "bizum" ? "Bizum" : "Transferencia bancaria")}</strong><table role="presentation" width="100%" cellpadding="0" cellspacing="0">${fields}</table></div>`);
}

export function renderEmailLayout({ title, greeting, contentHtml, contentText, closing, orderNumber, publicStorefrontUrl, replyTo }) {
  const logoUrl = getEmailLogoUrl(publicStorefrontUrl);
  const branding = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="MiLuGui" width="180" style="display:block;width:180px;max-width:100%;height:auto;border:0" />`
    : `<strong style="font-size:20px;letter-spacing:-.02em;color:#1c1917">MiLuGui</strong>`;
  const replyLine = replyTo ? "Si necesitas ayuda, responde a este correo." : "";
  const html = `<!doctype html><html lang="es"><body style="margin:0;padding:0;background:#f4f6f5;color:#242424;font-family:Arial,Helvetica,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:20px 10px"><table role="presentation" width="620" cellpadding="0" cellspacing="0" style="width:100%;max-width:620px;background:#fff;border:1px solid #e4eae7"><tr>${cell(branding, "padding:26px;background:#fff;border-bottom:2px solid #52aa9c;")}</tr><tr>${cell(`<h1 style="margin:0 0 14px;font-size:26px;line-height:1.25;color:#242424">${escapeHtml(title)}</h1><p style="margin:0;font-size:15px;line-height:1.6;color:#444">${escapeHtml(greeting)}</p>`, "padding:26px 26px 6px;")}</tr>${contentHtml}${section(`<p style="margin:0;font-size:14px;line-height:1.5;color:#444">${escapeHtml(closing)}</p>`)}<tr>${cell(`<strong style="font-size:14px;color:#242424">MiLuGui</strong><p style="margin:6px 0 0;font-size:12px;line-height:1.5;color:#66736f">Este correo corresponde a tu pedido ${escapeHtml(orderNumber)}.</p>${replyLine ? `<p style="margin:4px 0 0;font-size:12px;line-height:1.5;color:#66736f">${replyLine}</p>` : ""}`, "padding:20px 26px;background:#f7faf9;border-top:1px solid #e4eae7;")}</tr></table></td></tr></table></body></html>`;
  const text = ["MiLuGui", title, greeting, contentText, closing, `Este correo corresponde a tu pedido ${orderNumber}.`, replyLine].filter(Boolean).join("\n\n");
  return { html, text };
}
