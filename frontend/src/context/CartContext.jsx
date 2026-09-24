import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "../hooks/useAuth";
import {
  addOrMergeCartLine,
  buildCartStoragePayload,
  buildGuestCartSession,
  createCartLine,
  normalizeStoredCart,
  removeCartLine,
  updateCartLineCustomization,
  updateCartLineQuantity,
} from "../utils/cartLineAdapter";

// eslint-disable-next-line react-refresh/only-export-components
export const CartContext = createContext(null);

const getCartStorageKey = (userId) => `miTienda_cart_v2_${userId}`;
const getLegacyCartStorageKey = (userId) => `miTienda_cart_v1_${userId}`;
const GUEST_KEY = "guest_id";
const GUEST_SESSION_KEY = "guest_session_v1";
const GUEST_SESSION_TTL_DAYS = 7;

function getGuestId() {
  let id = localStorage.getItem(GUEST_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(GUEST_KEY, id);
  }
  return id;
}

function loadGuestSession() {
  try {
    const raw = localStorage.getItem(GUEST_SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    const diffDays =
      (Date.now() - new Date(session.updatedAt).getTime()) /
      (1000 * 60 * 60 * 24);
    if (diffDays > GUEST_SESSION_TTL_DAYS) {
      localStorage.removeItem(GUEST_SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

function saveGuestSession(partial) {
  try {
    const existing = loadGuestSession() || {};
    const next = partial.cart
      ? buildGuestCartSession(existing, partial.cart, {
          guestId: getGuestId(),
        })
      : {
          ...existing,
          ...partial,
          version: existing.version || 1,
          guestId: existing.guestId || getGuestId(),
          updatedAt: new Date().toISOString(),
        };
    localStorage.setItem(GUEST_SESSION_KEY, JSON.stringify(next));
  } catch {
    // El carrito no debe bloquear la navegación si storage no está disponible.
  }
}

function reportMigrationWarnings(result) {
  if (result.omittedCount > 0) {
    console.warn(
      `${result.omittedCount} línea(s) no se pudieron restaurar del carrito`,
      result.warnings
    );
  }
}

export function CartProvider({ children }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [items, setItems] = useState([]);
  const [hydratedIdentity, setHydratedIdentity] = useState(null);
  const identity = userId ? `user:${userId}` : "guest";

  useEffect(() => {
    let result = { items: [], omittedCount: 0, warnings: [] };

    if (userId) {
      try {
        const v2Key = getCartStorageKey(userId);
        const v2Raw = localStorage.getItem(v2Key);
        const legacyRaw = localStorage.getItem(getLegacyCartStorageKey(userId));
        const sourceRaw = v2Raw || legacyRaw;
        if (sourceRaw) result = normalizeStoredCart(JSON.parse(sourceRaw));

        if (!v2Raw && legacyRaw) {
          localStorage.setItem(
            v2Key,
            JSON.stringify(buildCartStoragePayload(result.items))
          );
        }
      } catch {
        result = { items: [], omittedCount: 0, warnings: [] };
      }
    } else {
      const session = loadGuestSession();
      result = normalizeStoredCart(session?.cart || []);
      if (session?.cart && session.cartVersion !== 2) {
        saveGuestSession({ cartVersion: 2, cart: result.items });
      }
    }

    reportMigrationWarnings(result);
    const syncTimer = setTimeout(() => {
      setItems(result.items);
      setHydratedIdentity(identity);
    }, 0);
    return () => clearTimeout(syncTimer);
  }, [identity, userId]);

  useEffect(() => {
    if (hydratedIdentity !== identity) return;

    if (userId) {
      localStorage.setItem(
        getCartStorageKey(userId),
        JSON.stringify(buildCartStoragePayload(items))
      );
    } else {
      saveGuestSession({ cartVersion: 2, cart: items });
    }
  }, [hydratedIdentity, identity, items, userId]);

  const addItem = useCallback((command) => {
    const line = createCartLine(command);
    setItems((current) => addOrMergeCartLine(current, line));
  }, []);

  const removeItem = useCallback((lineKey) => {
    setItems((current) => removeCartLine(current, lineKey));
  }, []);

  const updateQuantity = useCallback((lineKey, quantity) => {
    setItems((current) =>
      updateCartLineQuantity(current, lineKey, quantity)
    );
  }, []);

  const updateCustomization = useCallback((lineKey, customization) => {
    setItems((current) =>
      updateCartLineCustomization(current, lineKey, customization)
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    if (userId) localStorage.removeItem(getCartStorageKey(userId));
  }, [userId]);

  const totals = useMemo(() => {
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = items.reduce(
      (sum, item) => sum + item.quantity * item.presentation.displayPrice,
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
      updateCustomization,
      clearCart,
      ...totals,
    }),
    [
      items,
      addItem,
      removeItem,
      updateQuantity,
      updateCustomization,
      clearCart,
      totals,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
