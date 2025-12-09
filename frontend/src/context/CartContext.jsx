/*
// src/context/CartContext.jsx
import { createContext, useCallback, useMemo, useState } from "react";

export const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);
  // items: [{ productId, name, price, quantity, image, customization, requiresDesign }]

  const addItem = useCallback((product, quantity = 1, customization = null) => {
    setItems((prev) => {
      const qty = Number(quantity) || 1;
      const productId = product.id || product._id;
      const idx = prev.findIndex((i) => i.productId === productId);

      const requiresDesign = !!product.customizable; // <- clave

      if (idx === -1) {
        // NUEVO ITEM EN EL CARRITO
        return [
          ...prev,
          {
            productId,
            name: product.name,
            price: Number(product.price) || 0,
            quantity: qty,
            image: product.image || "",
            customization: customization || null,
            requiresDesign, // <- guardamos si este producto debe pasar por diseñador
          },
        ];
      }

      // YA EXISTE EN EL CARRITO → sumamos cantidad y actualizamos customización
      const next = [...prev];
      const current = next[idx];

      next[idx] = {
        ...current,
        quantity: current.quantity + qty,
        // si viene una nueva customization (no null/undefined), la usamos;
        // si no, dejamos la que hubiera
        customization: customization ?? current.customization ?? null,
        // requiere diseño si ya lo requería o si el producto lo indica
        requiresDesign: 
          typeof current.requiresDesign === "boolean"
            ? current.requiresDesign
            : requiresDesign,
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
*/

import { createContext, useCallback, useMemo, useState } from "react";

export const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);

  const addItem = useCallback((product, quantity = 1, customization = null) => {
    setItems((prev) => {
      const qty = Number(quantity) || 1;
      const productId = product.id || product._id;
      const idx = prev.findIndex((i) => i.productId === productId);

      const requiresDesign = !!product.customizable;

      // Si el producto ya existe en el carrito
      if (idx !== -1) {
        const existing = prev[idx];

        //  Clave
        // Si llega una customización => sustituimos completamente el items existente
        if (customization) {
          const updated = {
            ...existing,
            customization,
            requiresDesign,
            quantity: existing.quantity, // mantenemos la cantidad
          };

          const next = [...prev];
          next[idx] = updated;
          return next;
        }

        // Si no hay customización => comportamiento normal (añadir cantidad)
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

      // ⬅️ NUEVO: indicamos explícitamente si es personalizable
      const customizable = !!product.customizable;

      // ⬅️ NUEVO: solo guardamos customization si el producto es personalizable
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
            customizable, // ⬅️ NUEVO: necesario para checkout
          },
        ];
      }

      const next = [...prev];
      const current = next[idx];

      next[idx] = {
        ...current,
        quantity: current.quantity + qty,

        // si es personalizable → actualizamos personalización
        // si no → se borra siempre
        customization: customizable
          ? (customization ?? current.customization ?? null)
          : null,

        requiresDesign:
          typeof current.requiresDesign === "boolean"
            ? current.requiresDesign
            : requiresDesign,

        customizable, // ⬅️ NUEVO
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
