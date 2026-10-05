const EMAIL_EVENTS = Object.freeze([
  ["ORDER_RECEIVED", "Pedido recibido"],
  ["PAYMENT_PENDING", "Pago pendiente"],
  ["PAYMENT_CONFIRMED", "Pago confirmado"],
  ["ORDER_IN_PRODUCTION", "Producción"],
  ["ORDER_READY_FOR_PICKUP", "Listo para recogida"],
  ["ORDER_SHIPPED", "Pedido enviado"],
  ["NEW_ORDER_ADMIN", "Aviso a Admin"],
]);

export function getOrderEmailRows(order, emails) {
  const pickup = order.shipping?.type === "PICKUP_FREE" || order.shipping?.methodId === "pickup-free";
  return EMAIL_EVENTS.filter(([event]) => {
    if (event === "PAYMENT_PENDING") return ["bizum", "bank_transfer"].includes(order.payment?.method);
    if (event === "ORDER_READY_FOR_PICKUP") return pickup;
    if (event === "ORDER_SHIPPED") return !pickup;
    return true;
  }).map(([event, label]) => ({ event, label, email: emails.find((email) => email.event === event) || null }));
}
