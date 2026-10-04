// src/services/orders.service.js
import { http } from "./http";
import { normalizeCustomization } from "../utils/customizationAdapter";
import { buildShippingQuotePayload, toCheckoutItem } from "../utils/cartLineAdapter";

export async function createOrderRequest(items, data = {}) {
  const payload = {
    items: (items || []).map((item) => ({
      ...toCheckoutItem(item),
      customization: normalizeCustomization(item?.customization, {
        _id: item?.productId,
      }),
    })),
    paymentMethod: data.paymentMethod,
    guestId: data.guestId ?? null,
    email: data.email ?? null,
    customer: data.customer,
    termsAccepted: data.termsAccepted === true,
    shippingAddress: data.shippingAddress,
    billingAddress: data.billingAddress ?? null,
    notes: data.notes ?? "",
    couponCode: data.couponCode ?? "",
    shippingMethodId: data.shippingMethodId ?? null,
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

export async function getShippingQuoteRequest(items, shippingAddress, signal, options = {}) {
  const payload = buildShippingQuotePayload(items, shippingAddress, options);

  const { data } = await http.post("/api/shipping/quote", payload, { signal });
  return data;
}

export async function getManualPaymentMethodsRequest() {
  const { data } = await http.get("/api/payments/manual/methods");
  return data;
}

// Pedidos del usuario autenticado
export async function getMyOrdersRequest() {
  const { data } = await http.get("/api/orders/mine");
  return data; // { ok, orders }
}

export async function getMyOrderDetailRequest(orderId) {
  const { data } = await http.get(`/api/orders/mine/${orderId}`);
  return data;
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
