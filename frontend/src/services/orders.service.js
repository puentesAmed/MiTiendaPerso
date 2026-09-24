// src/services/orders.service.js
import { http } from "./http";
import { normalizeCustomization } from "../utils/customizationAdapter";

export async function createOrderRequest(items, data = {}) {
  const payload = {
    items: (items || []).map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      selectedVariant: item.selectedVariant ?? null,
      customization: normalizeCustomization(item?.customization, {
        _id: item?.productId,
      }),
    })),
    paymentMethod: data.paymentMethod,
    guestId: data.guestId ?? null,
    email: data.email ?? null,
    shippingAddress: data.shippingAddress,
    billingAddress: data.billingAddress ?? null,
    notes: data.notes ?? "",
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

export async function getShippingQuoteRequest(items, shippingAddress, signal) {
  const payload = {
    items: (items || []).map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      selectedVariant: item.selectedVariant ?? null,
    })),
    shippingAddress,
  };

  const { data } = await http.post("/api/shipping/quote", payload, { signal });
  return data;
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

export async function confirmOrderPayment(orderId) {
  const { data } = await http.post(`/api/orders/${orderId}/mark-paid`);
  return data;
}
