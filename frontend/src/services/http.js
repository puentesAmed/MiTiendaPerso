
// src/services/http.js
import axios from "axios";

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
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
