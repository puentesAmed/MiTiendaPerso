/*import { http } from "./http";

export async function createOrderRequest(items) {
  const payload = {
    items: items.map((it) => ({
      productId: it.productId,
      quantity: it.quantity,
    })),
  };

  const { data } = await http.post("/api/orders", payload);
  return data; // { ok, orderId, order }
}

export async function getMyOrdersRequest() {
  const { data } = await http.get("/api/orders/mine");
  return data; // { ok, orders }
}
*/

import { http } from "./http";

export async function createOrderRequest(items, paymentMethod = "card") {
  const payload = {
    items: items.map((it) => ({
      productId: it.productId,
      quantity: it.quantity,
    })),
    paymentMethod,
  };

  const { data } = await http.post("/api/orders", payload);
  return data; // { ok, orderId, order }
}

export async function getMyOrdersRequest() {
  const { data } = await http.get("/api/orders/mine");
  return data; // { ok, orders }
}
