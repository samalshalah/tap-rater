"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useCart } from "@/components/cart/cart-provider";
import { useAnalytics } from "@/components/analytics/analytics-provider";
import { cartAnalyticsItems, ecommerceData, type AnalyticsItem, type PurchaseData } from "@/lib/storefront-analytics";
import { trackEcommerce, trackPurchase } from "@/lib/analytics-browser";

export function CartAnalyticsEvents() {
  const { items } = useCart();
  const { ready } = useAnalytics();
  const pathname = usePathname();
  const lastRoute = useRef<string | null>(null);
  useEffect(() => {
    if (pathname !== "/cart" && pathname !== "/checkout") { lastRoute.current = null; return; }
    if (!ready || lastRoute.current === pathname) return;
    if (trackEcommerce(pathname === "/cart" ? "view_cart" : "begin_checkout", ecommerceData(cartAnalyticsItems(items)))) lastRoute.current = pathname;
  }, [items, pathname, ready]);
  return null;
}

export function ProductAnalyticsEvent({ item }: { item: AnalyticsItem }) {
  const { ready } = useAnalytics();
  const sent = useRef("");
  const key = JSON.stringify(item);
  useEffect(() => {
    if (ready && sent.current !== key && trackEcommerce("view_item", ecommerceData([JSON.parse(key)]))) sent.current = key;
  }, [key, ready]);
  return null;
}

export function PurchaseAnalyticsEvent({ purchase, pending }: { purchase: PurchaseData | null; pending: boolean }) {
  const { ready } = useAnalytics();
  const router = useRouter();
  const attempts = useRef(0);
  useEffect(() => { if (ready && purchase) void trackPurchase(purchase); }, [ready, purchase]);
  useEffect(() => {
    if (!ready || !pending || purchase) return;
    // Webhook confirmation can arrive after the redirect. Retry for one minute, without exposing an order API.
    const timer = setInterval(() => { if (++attempts.current > 12) { clearInterval(timer); return; } router.refresh(); }, 5000);
    return () => clearInterval(timer);
  }, [pending, purchase, ready, router]);
  return null;
}
