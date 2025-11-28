import { http } from "./http";

export function loginRequest(credentials) {
  return http.post("/auth/login", credentials);
}

export function registerRequest(data) {
  return http.post("/auth/register", data);
}
