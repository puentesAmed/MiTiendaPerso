import { api } from "./http"; // o fetch si no usas wrapper

export async function createMoneiPayment(orderId) {
  const res = await api.post("/api/payments/monei/create", {
    orderId,
  });

  return res.data;
}
