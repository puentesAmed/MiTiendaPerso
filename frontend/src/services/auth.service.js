/*import { http } from './http';

export function apiLogin(data) {
  // POST a /auth/login (el server ya lo tiene)
  return http.post('/auth/login', data);
}

export async function apiRegister(payload) {
  // payload: { name, email, password }
  return http.post("/auth/register", payload);
}
*/

import { http } from "./http";

export async function apiLogin(values) {
  const { data } = await http.post("/auth/login", values);
  // data: { token, user: { ... } }
  return data;
}

export async function apiRegister(values) {
  const { data } = await http.post("/auth/register", values);
  return data;
}
