"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  cartStorageKey,
  mergeCartItem,
  parseStoredCart,
  removeCartItem,
  updateCartQuantity,
  type CartItem
} from "@/lib/cart";

export type { CartItem } from "@/lib/cart";

type CartContextValue = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  decreaseItem: (productId: string) => void;
  increaseItem: (productId: string) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  count: number;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isRestored, setIsRestored] = useState(false);

  useEffect(() => {
    setItems(parseStoredCart(window.localStorage.getItem(cartStorageKey)));
    setIsRestored(true);
  }, []);

  useEffect(() => {
    if (!isRestored) {
      return;
    }

    window.localStorage.setItem(cartStorageKey, JSON.stringify(items));
  }, [isRestored, items]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: items.reduce((sum, item) => sum + item.quantity, 0),
      addItem: (item) => setItems((current) => mergeCartItem(current, item)),
      decreaseItem: (productId) => setItems((current) => updateCartQuantity(current, productId, -1)),
      increaseItem: (productId) => setItems((current) => updateCartQuantity(current, productId, 1)),
      removeItem: (productId) => setItems((current) => removeCartItem(current, productId)),
      clearCart: () => setItems([])
    }),
    [items]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside CartProvider.");
  }
  return context;
}
