/*// src/services/orders.service.js
import { http } from "./http";

// Crear pedido (checkout)
export async function createOrderRequest(items) {
  const payload = {
    items: items.map((it) => ({
      productId: it.productId,
      quantity: it.quantity,
      customization: it.customization ?? null, // incluir info de personalización
    })),
  };

  const { data } = await http.post("/api/orders", payload);
  return data; // { ok, orderId, order }
}

// Pedidos del usuario autenticado
export async function getMyOrdersRequest() {
  const { data } = await http.get("/api/orders/mine");
  return data; // { ok, orders }
}

// ADMIN: listar pedidos (con filtros opcionales)
export async function adminGetOrders(params = {}) {
  const { data } = await http.get("/api/orders", { params });
  return data; // { ok, orders }
}

export async function adminUpdateOrderStatus(orderId, status) {
  const { data } = await http.patch(`/api/orders/${orderId}/status`, { status });
  return data; // { ok, order, message }
}

*/

// src/services/orders.service.js
import { http } from "./http";

export async function createOrderRequest(items, data = {}) {
  const payload = {
    items,
    guestId: data.guestId ?? null,
    email: data.email ?? null,
    shippingAddress: data.shippingAddress,
    billingAddress: data.billingAddress ?? null,
    notes: data.notes ?? "",
    shipping: data.shipping,
    total: data.total ?? 0,
  };

  if (import.meta.env.DEV) {
    console.log("Creando pedido...");
  }


  const { data: response } = await http.post("/api/orders", payload);
  if (import.meta.env.DEV) {
    console.log("Pedido creado correctamente");
  }
  return response;
}

// Pedidos del usuario autenticado
export async function getMyOrdersRequest() {
  const { data } = await http.get("/api/orders/mine");
  return data; // { ok, orders }
}

// ADMIN: listar pedidos (con filtros opcionales)
export async function adminGetOrders(params = {}) {
  const { data } = await http.get("/api/orders", { params });
  return data; // { ok, orders }
}

export async function adminUpdateOrderStatus(orderId, status) {
  const { data } = await http.patch(`/api/orders/${orderId}/status`, { status });
  return data; // { ok, order, message }
}

export async function adminConfirmDeliveryDate(orderId, confirmedDeliveryDate) {
  const { data } = await http.put(
    `/api/orders/admin/${orderId}/delivery`,
    { confirmedDeliveryDate }
  );
  return data;
}
