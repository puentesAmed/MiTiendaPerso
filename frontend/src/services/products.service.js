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

// ADMIN: crear producto
export async function adminCreateProduct(payload) {
  const { data } = await http.post("/api/products", payload);
  return data.product;
}

// ADMIN: actualizar producto
export async function adminUpdateProduct(id, payload) {
  const { data } = await http.put(`/api/products/${id}`, payload);
  return data.product;
}

// ADMIN: borrar producto
export async function adminDeleteProduct(id) {
  const { data } = await http.delete(`/api/products/${id}`);
  return data;
}