"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { cartAnalyticsItems, ecommerceData } from "@/lib/storefront-analytics";
import { trackEcommerce } from "@/lib/analytics-browser";
import {
  cartStorageKey,
  getCartItemKey,
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
  storageUnavailable: boolean;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isRestored, setIsRestored] = useState(false);
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const currentItems = useRef<CartItem[]>([]);

  useEffect(() => {
    try {
      currentItems.current = parseStoredCart(window.localStorage.getItem(cartStorageKey));
    } catch {
      setStorageUnavailable(true);
    }
    setItems(currentItems.current);
    setIsRestored(true);
  }, []);

  useEffect(() => {
    if (!isRestored) {
      return;
    }

    try {
      window.localStorage.setItem(cartStorageKey, JSON.stringify(items));
      setStorageUnavailable(false);
    } catch {
      // Keep the in-memory cart usable when storage is blocked or full.
      setStorageUnavailable(true);
    }
  }, [isRestored, items]);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      storageUnavailable,
      count: items.reduce((sum, item) => sum + item.quantity, 0),
      addItem: (item) => changeItems(mergeCartItem(currentItems.current, item)),
      decreaseItem: (productId) => changeItems(updateCartQuantity(currentItems.current, productId, -1)),
      increaseItem: (productId) => changeItems(updateCartQuantity(currentItems.current, productId, 1)),
      removeItem: (productId) => changeItems(removeCartItem(currentItems.current, productId)),
      clearCart: () => { currentItems.current = []; setItems([]); }
    }),
    [items, storageUnavailable]
  );

  function changeItems(next: CartItem[]) {
    const before = currentItems.current;
    currentItems.current = next;
    setItems(next);
    // User actions only: restoration and clearing a paid cart are not cart-removal events.
    try {
      for (const item of next) {
        const quantity = item.quantity - (before.find((old) => getCartItemKey(old) === getCartItemKey(item))?.quantity ?? 0);
        if (quantity > 0) trackEcommerce("add_to_cart", ecommerceData(cartAnalyticsItems([{ ...item, quantity }])));
      }
      for (const item of before) {
        const quantity = item.quantity - (next.find((entry) => getCartItemKey(entry) === getCartItemKey(item))?.quantity ?? 0);
        if (quantity > 0) trackEcommerce("remove_from_cart", ecommerceData(cartAnalyticsItems([{ ...item, quantity }])));
      }
    } catch {
      // Optional measurement must not interrupt a cart action or navigation.
    }
  }

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside CartProvider.");
  }
  return context;
}
