// src/services/orders.service.js
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

