// CartContext.jsx
import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "../hooks/useAuth";
import { normalizeCustomization } from "../utils/customizationAdapter";

// eslint-disable-next-line react-refresh/only-export-components
export const CartContext = createContext(null);

const getCartStorageKey = (userId) => `miTienda_cart_v1_${userId}`;

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
    const updatedAt = new Date(session.updatedAt);
    //const now = new Date();

    const diffDays =
      (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);

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

    localStorage.setItem(
      GUEST_SESSION_KEY,
      JSON.stringify({
        ...existing,
        ...partial,
        version: 1,
        guestId: getGuestId(),
        updatedAt: new Date().toISOString(),
      })
    );
  } catch {
    // silencioso
  }
}


export function CartProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);

   /* ───────────────────────────────
     RESTAURAR CARRITO
  ──────────────────────────────── */
  

  useEffect(() => {
    let nextItems = [];

    if (user?.id) {
      try {
        const raw = localStorage.getItem(getCartStorageKey(user.id));
        if (raw) {
          const parsed = JSON.parse(raw);
          nextItems = Array.isArray(parsed.items) ? parsed.items : [];
        }
      } catch {
        nextItems = [];
      }
    } else {
      const guestSession = loadGuestSession();
      nextItems = guestSession?.cart || [];
    }

    const syncTimer = setTimeout(() => setItems(nextItems), 0);
    return () => clearTimeout(syncTimer);
  }, [user]);


  /*// ===============================
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
  }, [items, user]);*/

  /* ───────────────────────────────
     PERSISTIR CARRITO
  ──────────────────────────────── */
  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(
        getCartStorageKey(user.id),
        JSON.stringify({
          version: 1,
          items,
          updatedAt: new Date().toISOString(),
        })
      );
    } else {
      saveGuestSession({ cart: items });
    }
  }, [items, user]); 

  // ===============================
  // LÓGICA ORIGINAL (SIN CAMBIOS) API
  // ===============================
 // const addItem = useCallback((product, quantity = 1, customization = null, selectedVariant = null) => {
  const addItem = useCallback((product, quantity = 1, variant = null, customization = null) => {
    setItems((prev) => {
      const qty = Number(quantity) || 1;
      const productId = product.id || product._id;
      //const idx = prev.findIndex((i) => i.productId === productId);
      const idx = prev.findIndex(
        (i) =>
          i.productId === productId &&
          (i.skuId || null) === (variant?.skuId || null)
      );
      const requiresDesign = !!product.customizable;

      if (idx !== -1) {
        const existing = prev[idx];

        /*if (customization || selectedVariant) {
          const next = [...prev];
          next[idx] = {
            ...existing,
            customization: customization ?? existing.customization,
            selectedVariant: selectedVariant ?? existing.selectedVariant,
            requiresDesign,
            quantity: existing.quantity,
          };
          return next;
        }*/

          if (customization || variant) {
            const next = [...prev];
            next[idx] = {
              ...existing,
              customization: customization
                ? normalizeCustomization(customization, product)
                : existing.customization,

              skuId: variant?.skuId ?? existing.skuId,
              variantAttributes: variant?.attributes ?? existing.variantAttributes,

              requiresDesign: true,
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

      /*return [
        ...prev,
        {
          productId,
          name: product.name,
          price: Number(product.price) || 0,
          quantity: qty,
          image: product.image || "",
          customization: product.customizable ? normalizeCustomization(customization, product) : null,
          selectedVariant: selectedVariant || null,
          requiresDesign,
          customizable: !!product.customizable,
        },
      ];*/
      return [
        ...prev,
        {
          productId,
          externalId: product.externalId || null,
          provider: product.provider || "internal",
          supplierId: product.supplierId || null,

          name: product.name,
          price: variant?.price?.final ?? Number(product.price || 0),
          quantity: qty,
          image: product.image || "",

          skuId: variant?.skuId || null,
          variantAttributes: variant?.attributes || null,

          customization: product.customizable ? normalizeCustomization(customization, product) : null,

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
      prev.map((i) =>
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

  /*const value = useMemo(
    () => ({
      items,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      ...totals,
    }),
    [items, addItem, removeItem, updateQuantity, clearCart, totals]
  );*/

  return (
    <CartContext.Provider value={{items, addItem, removeItem, updateQuantity, clearCart, ...totals}}>
      {children}
    </CartContext.Provider>
  );
}
