import {
  createContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from "react";
import { apiLogin, apiRegister } from "../services/auth.service";


export const AuthContext = createContext(null);
const KEY = "auth_user";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem(KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Sincroniza user <-> localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem(KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(KEY);
    }
  }, [user]);

  const login = useCallback(async (values) => {
    const data = await apiLogin(values); // { token, user:{...} }

    // APLANAMOS: guardamos todo en un solo objeto
    const authUser = {
      token: data.token,
      id: data.user.id,
      email: data.user.email,
      role: data.user.role,
      name: data.user.name,
    };

    setUser(authUser);
  }, []);

  const registerUser = useCallback(async (values) => {
    const data = await apiRegister(values);
    return data; // { message, userId }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
  }, []);

  const isAuthenticated = !!user?.token;

  const value = useMemo(
    () => ({
      user,
      isAuthenticated,
      login,
      logout,
      registerUser,
      setUser,
    }),
    [user, isAuthenticated, login, logout, registerUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
