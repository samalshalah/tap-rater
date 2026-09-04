"use client";

import { useEffect } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { cartStorageKey } from "@/lib/cart";

export function CheckoutSuccessEffects({ sessionId }: { sessionId: string }) {
  const { clearCart } = useCart();

  useEffect(() => {
    if (!sessionId) return;

    const checkoutStorageKey = `taprater:embedded-checkout:${sessionId}`;
    if (!window.sessionStorage.getItem(checkoutStorageKey)) return;

    window.localStorage.setItem(cartStorageKey, "[]");
    clearCart();
    window.sessionStorage.removeItem(checkoutStorageKey);
  }, [clearCart, sessionId]);

  return null;
}
