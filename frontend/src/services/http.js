/*import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export const http = axios.create({
  baseURL,
  timeout: 10000,
  headers: { "Content-Type": "application/json" },
});

// Inyectar token si existe
http.interceptors.request.use((config) => {
  const token = localStorage.getItem("mitiendaperso_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

http.interceptors.response.use(
  (r) => r,
  (e) =>
    Promise.reject({
      status: e.response?.status ?? 0,
      message: e.response?.data?.message ?? e.message ?? "Error",
    })
);

export async function get(url, config = {}) {
  const { data } = await http.get(url, config);
  return data;
}

export async function post(url, body, config = {}) {
  const { data } = await http.post(url, body, config);
  return data;
}

export async function put(url, body, config = {}) {
  const { data } = await http.put(url, body, config);
  return data;
}

export async function del(url, config = {}) {
  const { data } = await http.delete(url, config);
  return data;
}
*/
import axios from 'axios';

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem('mitiendaperso_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
