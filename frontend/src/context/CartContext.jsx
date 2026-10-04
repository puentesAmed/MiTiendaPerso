import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
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
import { getGuestId, loadGuestSession, saveGuestSession } from "../services/guestSession.service";
import { calculateCartTotals, cartFeedbackReducer, INITIAL_CART_FEEDBACK, scheduleCartPulseExpiry } from "./cartFeedback";

// eslint-disable-next-line react-refresh/only-export-components
export const CartContext = createContext(null);

const getCartStorageKey = (userId) => `miTienda_cart_v2_${userId}`;
const getLegacyCartStorageKey = (userId) => `miTienda_cart_v1_${userId}`;
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
  const [cartFeedback, dispatchCartFeedback] = useReducer(cartFeedbackReducer, INITIAL_CART_FEEDBACK);
  const identity = userId ? `user:${userId}` : "guest";

  useEffect(() => {
    dispatchCartFeedback({ type: "cart-empty" });
    let result = { items: [], omittedCount: 0, warnings: [] };

    if (userId) {
      try {
        const v2Key = getCartStorageKey(userId);
        const v2Raw = localStorage.getItem(v2Key);
        const legacyRaw = localStorage.getItem(getLegacyCartStorageKey(userId));
        const sourceRaw = v2Raw || legacyRaw;
        if (sourceRaw) result = normalizeStoredCart(JSON.parse(sourceRaw));

        const guestSession = loadGuestSession();
        const guestResult = normalizeStoredCart(guestSession?.cart || []);
        if (guestResult.items.length > 0) {
          result = {
            ...result,
            items: guestResult.items.reduce(
              (current, line) => addOrMergeCartLine(current, line),
              result.items
            ),
            omittedCount: result.omittedCount + guestResult.omittedCount,
            warnings: [...result.warnings, ...guestResult.warnings],
          };
          localStorage.setItem(v2Key, JSON.stringify(buildCartStoragePayload(result.items)));
          saveGuestSession({ cartVersion: 2, cart: [] });
        }

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
        saveGuestSession(buildGuestCartSession(session || {}, result.items, { guestId: getGuestId() }));
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
    if (!cartFeedback.active) return undefined;
    const timerId = scheduleCartPulseExpiry(cartFeedback.generation, (generation) => {
      dispatchCartFeedback({ type: "pulse-expired", generation });
    });
    return () => clearTimeout(timerId);
  }, [cartFeedback.active, cartFeedback.generation]);

  useEffect(() => {
    if (hydratedIdentity !== identity) return;

    if (userId) {
      localStorage.setItem(
        getCartStorageKey(userId),
        JSON.stringify(buildCartStoragePayload(items))
      );
    } else {
      saveGuestSession(buildGuestCartSession(loadGuestSession() || {}, items, { guestId: getGuestId() }));
    }
  }, [hydratedIdentity, identity, items, userId]);

  const addItem = useCallback((command) => {
    const line = createCartLine(command);
    setItems((current) => addOrMergeCartLine(current, line));
    dispatchCartFeedback({ type: "item-added" });
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
    dispatchCartFeedback({ type: "cart-empty" });
    if (userId) localStorage.removeItem(getCartStorageKey(userId));
  }, [userId]);

  const totals = useMemo(() => calculateCartTotals(items), [items]);

  useEffect(() => {
    if (totals.totalItems === 0) dispatchCartFeedback({ type: "cart-empty" });
  }, [totals.totalItems]);

  const value = useMemo(
    () => ({
      items,
      addItem,
      removeItem,
      updateQuantity,
      updateCustomization,
      clearCart,
      cartPulse: cartFeedback.active && totals.totalItems > 0,
      cartPulseKey: cartFeedback.generation,
      ...totals,
    }),
    [
      items,
      addItem,
      removeItem,
      updateQuantity,
      updateCustomization,
      clearCart,
      cartFeedback,
      totals,
    ]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}
