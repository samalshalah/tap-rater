"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useCart } from "@/components/cart/cart-provider";
import { useAnalytics } from "@/components/analytics/analytics-provider";
import { cartAnalyticsItems, ecommerceData, type AnalyticsItem, type PurchaseData } from "@/lib/storefront-analytics";
import { trackEcommerce, trackPurchase } from "@/lib/analytics-browser";
import { trackMetaEcommerce, trackMetaPurchase } from "@/lib/meta-pixel";

export function CartAnalyticsEvents() {
  const { items } = useCart();
  const { ready, metaReady } = useAnalytics();
  const pathname = usePathname();
  const lastRoute = useRef<string | null>(null);
  const lastMetaRoute = useRef<string | null>(null);
  useEffect(() => {
    if (pathname !== "/checkout") { lastMetaRoute.current = null; return; }
    if (metaReady && lastMetaRoute.current !== pathname && trackMetaEcommerce("begin_checkout", ecommerceData(cartAnalyticsItems(items)))) lastMetaRoute.current = pathname;
  }, [items, pathname, metaReady]);
  useEffect(() => {
    if (pathname !== "/cart" && pathname !== "/checkout") { lastRoute.current = null; return; }
    if (!ready || lastRoute.current === pathname) return;
    if (trackEcommerce(pathname === "/cart" ? "view_cart" : "begin_checkout", ecommerceData(cartAnalyticsItems(items)))) lastRoute.current = pathname;
  }, [items, pathname, ready]);
  return null;
}

export function ProductAnalyticsEvent({ item }: { item: AnalyticsItem }) {
  const { ready, metaReady } = useAnalytics();
  const sent = useRef("");
  const metaSent = useRef("");
  const key = JSON.stringify(item);
  useEffect(() => {
    if (metaReady && metaSent.current !== key && trackMetaEcommerce("view_item", ecommerceData([JSON.parse(key)]))) metaSent.current = key;
  }, [key, metaReady]);
  useEffect(() => {
    if (ready && sent.current !== key && trackEcommerce("view_item", ecommerceData([JSON.parse(key)]))) sent.current = key;
  }, [key, ready]);
  return null;
}

export function PurchaseAnalyticsEvent({ purchase, pending }: { purchase: PurchaseData | null; pending: boolean }) {
  const { ready, metaReady } = useAnalytics();
  const router = useRouter();
  const attempts = useRef(0);
  useEffect(() => { if (ready && purchase) void trackPurchase(purchase); }, [ready, purchase]);
  useEffect(() => { if (metaReady && purchase) trackMetaPurchase(purchase); }, [metaReady, purchase]);
  useEffect(() => {
    if ((!ready && !metaReady) || !pending || purchase) return;
    // Webhook confirmation can arrive after the redirect. Retry for one minute, without exposing an order API.
    const timer = setInterval(() => { if (++attempts.current > 12) { clearInterval(timer); return; } router.refresh(); }, 5000);
    return () => clearInterval(timer);
  }, [pending, purchase, ready, metaReady, router]);
  return null;
}
