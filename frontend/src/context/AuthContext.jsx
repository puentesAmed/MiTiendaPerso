/*/import { createContext, useEffect, useMemo, useState, useCallback } from "react";
import { apiLogin } from "../services/auth.service";
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
    const data = await apiLogin(values);
    setUser(data); // data = { token, user:{...} }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, login, logout, setUser }), [user, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
*/

/*// src/context/AuthContext.jsx
import {
  createContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { apiLogin } from "../services/auth.service";

export const AuthContext = createContext(null);

const KEY = "auth_user";
const USER_KEY = "auth_user";
const TOKEN_KEY = "auth_token";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem(USER_KEY);
    return stored ? JSON.parse(stored) : null; // { id, email, name, role }
  });

  // hidratar usuario y token al montar la app (si hubiera sesión previa)
  useEffect(() => {
    const storedUser = localStorage.getItem(USER_KEY);
    const storedToken = localStorage.getItem(TOKEN_KEY);

    if (storedUser && storedToken && !user) {
      setUser(JSON.parse(storedUser));
      // el token lo leerá siempre el interceptor de axios desde localStorage
    }
  }, [user]);

  const login = useCallback(async (values) => {
    const data = await apiLogin(values);
    // data = { token, user: { id, email, name, role, ... } }

    const loggedUser = data.user;
    const token = data.token;

    // Guardamos por separado usuario y token
    localStorage.setItem(USER_KEY, JSON.stringify(loggedUser));
    localStorage.setItem(TOKEN_KEY, token);

    setUser(loggedUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,      // { id, email, name, role }
      login,
      logout,
      setUser,
    }),
    [user, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
*/

// src/context/AuthContext.jsx
import { createContext, useEffect, useMemo, useState, useCallback } from "react";
import { apiLogin, apiRegister } from "../services/auth.service";
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
    const data = await apiLogin(values); // { token, user: {...} }
    setUser(data);
  }, []);

 // NUEVO: registro de usuario
  const registerUser = useCallback(async (values) => {
    // values: { name, email, password }
    const data = await apiRegister(values);
    // aquí NO iniciamos sesión automática porque el backend
    // solo devuelve { message, userId }. Si quisieras auto-login,
    // habría que cambiar el backend.
    return data;
  }, []);


  const logout = useCallback(() => {
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, login, logout, registerUser, setUser, }),
    [user, login, logout, registerUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
