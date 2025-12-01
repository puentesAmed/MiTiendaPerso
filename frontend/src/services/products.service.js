import { http } from "./http";

/**
 * Obtiene productos desde el backend con filtros opcionales.
 * params puede incluir: { q, category, minPrice, maxPrice }
 */
export async function apiGetProducts(params = {}) {
  const res = await http.get("/api/products", { params });
  // Tu backend responde { ok: true, products: [...] }
  return res.data.products || [];
}

/**
 * Obtiene un producto por id
 */
export async function apiGetProduct(id) {
  const res = await http.get(`/api/products/${id}`);
  return res.data.product;
}
