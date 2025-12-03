import { createContext, useCallback, useMemo, useState } from "react";

export const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]); 
  // items: [{ productId, name, price, quantity, image }]

  const addItem = useCallback((product, quantity = 1, customization = null) => {
    setItems((prev) => {
      const qty = Number(quantity) || 1;
      const idx = prev.findIndex((i) => i.productId === product.id || i.productId === product._id);

      const productId = product.id || product._id;

      if (idx === -1) {
        return [
          ...prev,
          {
            productId,
            name: product.name,
            price: Number(product.price) || 0,
            quantity: qty,
            image: product.image || "",
            customization, // { enabled, areaCode, imageUrl, text, notes, widthMm, heightMm }
          },
        ];
      }

      const next = [...prev];
      next[idx] = {
        ...next[idx],
        quantity: next[idx].quantity + qty,
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

  const clearCart = useCallback(() => setItems([]), []);

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
