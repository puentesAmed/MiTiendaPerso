/*import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

export const CartContext = createContext(null);

const CART_STORAGE_KEY = "miTienda_cart_v1";

export function CartProvider({ children }) {
  // ===============================
  // 🔹 INICIALIZAR DESDE localStorage
  // ===============================
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed.items) ? parsed.items : [];
    } catch {
      return [];
    }
  });

  // ===============================
  // 🔹 PERSISTIR EN CADA CAMBIO
  // ===============================
  useEffect(() => {
    try {
      const payload = {
        version: 1,
        items,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // silencioso
    }
  }, [items]);

  // ===============================
  // 🔹 TU LÓGICA ORIGINAL (SIN CAMBIOS)
  // ===============================
  const addItem = useCallback((product, quantity = 1, customization = null) => {
    setItems((prev) => {
      const qty = Number(quantity) || 1;
      const productId = product.id || product._id;
      const idx = prev.findIndex((i) => i.productId === productId);

      const requiresDesign = !!product.customizable;

      if (idx !== -1) {
        const existing = prev[idx];

        if (customization) {
          const updated = {
            ...existing,
            customization,
            requiresDesign,
            quantity: existing.quantity,
          };

          const next = [...prev];
          next[idx] = updated;
          return next;
        }

        const next = [...prev];
        next[idx] = {
          ...existing,
          quantity: existing.quantity + qty,
          requiresDesign:
            typeof existing.requiresDesign === "boolean"
              ? existing.requiresDesign
              : requiresDesign,
        };
        return next;
      }

      const customizable = !!product.customizable;
      const finalCustomization = customizable ? customization : null;

      if (idx === -1) {
        return [
          ...prev,
          {
            productId,
            name: product.name,
            price: Number(product.price) || 0,
            quantity: qty,
            image: product.image || "",
            customization: finalCustomization,
            requiresDesign,
            customizable,
          },
        ];
      }

      const next = [...prev];
      const current = next[idx];

      next[idx] = {
        ...current,
        quantity: current.quantity + qty,
        customization: customizable
          ? (customization ?? current.customization ?? null)
          : null,
        requiresDesign:
          typeof current.requiresDesign === "boolean"
            ? current.requiresDesign
            : requiresDesign,
        customizable,
      };

      return next;
    });
  }, []);

  const removeItem = useCallback((productId) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const updateQuantity = useCallback((productId, quantity) => {
    const qty = Number(quantity) || 0;
    setItems((prev) =>
      prev
        .map((i) =>
          i.productId === productId ? { ...i, quantity: qty } : i
        )
        .filter((i) => i.quantity > 0)
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    localStorage.removeItem(CART_STORAGE_KEY);
  }, []);

  const totals = useMemo(() => {
    const totalItems = items.reduce((acc, it) => acc + it.quantity, 0);
    const totalAmount = items.reduce(
      (acc, it) => acc + it.quantity * it.price,
      0
    );
    return { totalItems, totalAmount };
  }, [items]);

  const value = useMemo(
    () => ({
      items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      ...totals,
    }),
    [items, addItem, removeItem, updateQuantity, clearCart, totals]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
*/

// CartContext.jsx
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "../hooks/useAuth";
import { v4 as uuid } from "uuid";

export const CartContext = createContext(null);

const getCartStorageKey = (userId) => `miTienda_cart_v1_${userId}`;

const GUEST_KEY = "guest_id";

function getGuestId() {
  let id = localStorage.getItem(GUEST_KEY);
  if (!id) {
    id = uuid();
    localStorage.setItem(GUEST_KEY, id);
  }
  return id;
}

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);

  // ===============================
  // CARGAR CARRITO POR USUARIO
  // ===============================
  useEffect(() => {
    if (!user?.id) {
      setItems([]);
      return;
    }

    try {
      const raw = localStorage.getItem(getCartStorageKey(user.id));
      if (!raw) {
        setItems([]);
        return;
      }

      const parsed = JSON.parse(raw);
      setItems(Array.isArray(parsed.items) ? parsed.items : []);
    } catch {
      setItems([]);
    }
  }, [user]);

  // ===============================
  // PERSISTIR CARRITO POR USUARIO
  // ===============================
  useEffect(() => {
    if (!user?.id) return;

    try {
      const payload = {
        version: 1,
        items,
        updatedAt: new Date().toISOString(),
      };
      localStorage.setItem(
        getCartStorageKey(user.id),
        JSON.stringify(payload)
      );
    } catch {
      // silencioso
    }
  }, [items, user]);

  // ===============================
  // LÓGICA ORIGINAL (SIN CAMBIOS)
  // ===============================
  const addItem = useCallback((product, quantity = 1, customization = null) => {
    setItems((prev) => {
      const qty = Number(quantity) || 1;
      const productId = product.id || product._id;
      const idx = prev.findIndex((i) => i.productId === productId);
      const requiresDesign = !!product.customizable;

      if (idx !== -1) {
        const existing = prev[idx];

        if (customization) {
          const next = [...prev];
          next[idx] = {
            ...existing,
            customization,
            requiresDesign,
            quantity: existing.quantity,
          };
          return next;
        }

        const next = [...prev];
        next[idx] = {
          ...existing,
          quantity: existing.quantity + qty,
          requiresDesign:
            typeof existing.requiresDesign === "boolean"
              ? existing.requiresDesign
              : requiresDesign,
        };
        return next;
      }

      return [
        ...prev,
        {
          productId,
          name: product.name,
          price: Number(product.price) || 0,
          quantity: qty,
          image: product.image || "",
          customization: product.customizable ? customization : null,
          requiresDesign,
          customizable: !!product.customizable,
        },
      ];
    });
  }, []);

  const removeItem = useCallback((productId) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const updateQuantity = useCallback((productId, quantity) => {
    const qty = Number(quantity) || 0;
    setItems((prev) =>
      prev
        .map((i) =>
          i.productId === productId ? { ...i, quantity: qty } : i
        )
        .filter((i) => i.quantity > 0)
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    if (user?.id) {
      localStorage.removeItem(getCartStorageKey(user.id));
    }
  }, [user]);

  const totals = useMemo(() => {
    const totalItems = items.reduce((acc, it) => acc + it.quantity, 0);
    const totalAmount = items.reduce(
      (acc, it) => acc + it.quantity * it.price,
      0
    );
    return { totalItems, totalAmount };
  }, [items]);

  const value = useMemo(
    () => ({
      items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      ...totals,
    }),
    [items, addItem, removeItem, updateQuantity, clearCart, totals]
  );

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}
