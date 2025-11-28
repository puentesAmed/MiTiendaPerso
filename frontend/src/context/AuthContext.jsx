import { createContext, useEffect, useMemo, useState, useCallback } from "react";
import { loginRequest } from "../services/auth.service";
import { http } from "../services/http";

export const AuthContext = createContext(null);
const KEY = "auth_user";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem(KEY);
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    if (user?.token) {
      http.defaults.headers.common.Authorization = `Bearer ${user.token}`;
      localStorage.setItem(KEY, JSON.stringify(user));
    } else {
      delete http.defaults.headers.common.Authorization;
      localStorage.removeItem(KEY);
    }
  }, [user]);

  const login = useCallback(async (values) => {
    const data = await loginRequest(values);
    setUser(data); // data = { token, user:{...} }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, login, logout, setUser }), [user, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
