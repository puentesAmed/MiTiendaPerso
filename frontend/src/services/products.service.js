/*import { http } from "./http";


export async function apiGetProducts(params = {}) {
  const res = await http.get("/api/products", { params });
  console.log('apiGetProducts response:', res.data);
  // Tu backend responde { ok: true, products: [...] }
  return res.data.products || [];
}


export async function apiGetProduct(id) {
  const res = await http.get(`/api/products/${id}`);
  return res.data.product;
}
*/

import { http } from "./http";

export async function apiGetProducts(params = {}) {
  const { data } = await http.get("/api/products", { params });
  console.log('apiGetProducts response:', data);
  // backend devuelve { ok, products }
  return data.products ?? [];
}

export async function apiGetProductById(id) {
  const { data } = await http.get(`/api/products/${id}`);
  return data.product;
}
