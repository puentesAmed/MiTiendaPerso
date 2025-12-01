import { http } from './http';

export function apiLogin(data) {
  // POST a /auth/login (el server ya lo tiene)
  return http.post('/auth/login', data);
}

export async function apiRegister(payload) {
  // payload: { name, email, password }
  return http.post("/auth/register", payload);
}
