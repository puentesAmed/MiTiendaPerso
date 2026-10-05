export function displayOrderNumber(order) {
  if (order?.orderNumber) return order.orderNumber;
  const id = String(order?._id || order?.orderId || "");
  return id ? `LEGACY-${id.slice(-8)}` : "—";
}
