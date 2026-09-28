
// src/services/http.js
import axios from "axios";

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();

export const apiBaseUrl =
  configuredApiUrl || (import.meta.env.DEV ? "http://localhost:3000" : "");

export const http = axios.create({
  baseURL: apiBaseUrl,
});

// Leer siempre de auth_user
http.interceptors.request.use((config) => {
  const stored = localStorage.getItem("auth_user");
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (parsed?.token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${parsed.token}`;
      }
    } catch {
      // ignoramos errores de parseo
    }
  }
  return config;
});
