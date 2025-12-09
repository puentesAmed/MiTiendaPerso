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

export async function createOrderRequest(items, paymentMethod) {
  try {
    const { data } = await http.post("/api/orders", {
      items,
      paymentMethod,
    });

    return data;
  } catch (err) {
    console.error("Error en createOrderRequest:", err.response?.data || err);
    return {
      ok: false,
      message: err.response?.data?.message || "Error al procesar el pedido",
    };
  }
}

// Pedidos del usuario autenticado
export async function getMyOrdersRequest() {
  const { data } = await http.get("/api/orders/mine");
  return data; // { ok, orders }
}


// ADMIN: obtener pedidos
export async function adminGetOrders(params = {}) {
  const { data } = await http.get("/api/orders", { params });
  return data;
}

// ADMIN: actualizar estado
export async function adminUpdateOrderStatus(id, status) {
  const { data } = await http.patch(`/api/orders/${id}/status`, { status });
  return data;
}
