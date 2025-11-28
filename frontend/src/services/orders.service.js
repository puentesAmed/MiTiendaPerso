import { http } from "./http";

export async function createOrderRequest(items) {
  // items = [{ productId, quantity, ... }]
  const payload = {
    items: items.map((it) => ({
      productId: it.productId,
      quantity: it.quantity,
    })),
  };

  const { data } = await http.post("/orders", payload);
  return data; // { ok, orderId, order }
}

export async function getMyOrdersRequest() {
  const { data } = await http.get("/orders/mine");
  return data; // { ok, orders }
}
