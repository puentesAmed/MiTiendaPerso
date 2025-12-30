import { http } from "./http";
import { normalizeProduct } from "../utils/normalizeProduct";

export async function apiGetProducts(params = {}) {
  const { data } = await http.get("/api/products", { params });

   const first = (data.products ?? [])[0];
    console.log("[RAW first product]", first);
    console.log("[RAW price]", first?.price, "type:", typeof first?.price);
    console.log("[RAW price.value]", first?.price?.value, "type:", typeof first?.price?.value);
    console.log("[RAW stock]", first?.stock, "type:", typeof first?.stock);

  return (data.products ?? []).map(normalizeProduct);
}

export async function apiGetProductById(id) {
  const { data } = await http.get(`/api/products/${id}`);
  return data.product ? normalizeProduct(data.product) : null;
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