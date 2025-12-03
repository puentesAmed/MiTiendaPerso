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
