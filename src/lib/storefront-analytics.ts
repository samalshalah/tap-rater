import type { CartItem } from "@/lib/cart";
import { getCatalogCategories, getProductBySlug } from "@/lib/products";
import { lockedBusinessUses } from "@/lib/catalog-architecture";
import { getCategoryHref } from "@/lib/category-routes";
import { getPurchaseOption } from "@/lib/purchase-options";
import { getConfiguredUnitPriceCents } from "@/lib/product-model";

export type AnalyticsConfig = {
  metaPixelId?: string | null;
  metaCatalogIds?: Record<string, string>;
  measurementId: string | null;
  origin: string;
  serverPurchases?: boolean;
  internal?: boolean;
};
export type AnalyticsItem = {
  item_id: string;
  item_name?: string;
  item_variant: string;
  price: number;
  quantity: number;
};
export type EcommerceData = {
  currency: "USD";
  value: number;
  items: AnalyticsItem[];
};
export type PurchaseData = EcommerceData & {
  transaction_id: string;
  tax: number;
  shipping: number;
};
export type EcommerceEvent =
  | "view_item"
  | "add_to_cart"
  | "remove_from_cart"
  | "view_cart"
  | "begin_checkout";
export type ConsentChoice = "granted" | "denied";
export const consentStorageKey = "taprater:analytics-consent:v1";
export const consentMaxAge = 180 * 24 * 60 * 60 * 1000;

export function getAnalyticsConfig(
  env: Record<string, string | undefined> = process.env,
): AnalyticsConfig {
  const id = env.GA4_MEASUREMENT_ID?.trim() ?? "";
  // This gate requires the owner to disable Enhanced Measurement in the GA web stream.
  const enabled =
    env.GA4_ENABLED === "true" && env.GA4_MANUAL_EVENTS_CONFIRMED === "true";
  return {
    measurementId: enabled && /^G-[A-Z0-9]{6,20}$/.test(id) ? id : null,
    origin: "https://taprater.com",
    serverPurchases: Boolean(env.GA4_API_SECRET),
  };
}

export function readConsent(
  raw: string | null,
  now = Date.now(),
): ConsentChoice | null {
  try {
    const value = JSON.parse(raw ?? "null");
    return value?.version === 1 &&
      (value.choice === "granted" || value.choice === "denied") &&
      Number.isFinite(value.savedAt) &&
      value.savedAt <= now &&
      now - value.savedAt < consentMaxAge
      ? value.choice
      : null;
  } catch {
    return null;
  }
}

export function analyticsReferrer(raw: string) {
  try {
    const url = new URL(raw);
    const sources = new Set([
      "google.com",
      "www.google.com",
      "bing.com",
      "www.bing.com",
      "search.yahoo.com",
      "duckduckgo.com",
      "www.facebook.com",
      "l.facebook.com",
      "www.instagram.com",
      "www.linkedin.com",
    ]);
    return url.protocol === "https:" && sources.has(url.hostname)
      ? `${url.origin}/`
      : "";
  } catch {
    return "";
  }
}

// Only public, known-shaped routes are measured. Queries, fragments and arbitrary slugs are never copied.
const publicPages = new Set([
  "/category", // Accept legacy grouped attribution from existing sessions.
  "/",
  "/shop",
  "/cart",
  "/checkout",
  "/checkout/success",
  "/checkout/cancel",
  "/multi-link",
  "/custom-stands",
  "/solutions",
  "/how-it-works",
  "/faqs",
  "/support",
  "/contact-us",
  "/about",
  "/about-us",
  "/shipping",
  "/terms",
  "/privacy-policy",
  "/refund-policy",
  "/review-links-generator",
  "/setup-new-taprater",
  "/change-taprater-link",
]);

const landingPages = new Map([
  ...getCatalogCategories().map((category) => [getCategoryHref(category.slug), `Tap Rater | ${category.title}`] as const),
  ...lockedBusinessUses.filter((business) => business.isActive).map((business) => [`/solutions/${business.slug}`, `Tap Rater | ${business.title}`] as const),
]);

export function analyticsPage(pathname: string) {
  const landingTitle = landingPages.get(pathname);
  if (landingTitle) return { path: pathname, title: landingTitle };
  if (publicPages.has(pathname))
    return {
      path: pathname,
      title: pathname === "/" ? "Tap Rater" : `Tap Rater ${pathname.slice(1)}`,
    };
  if (
    /^\/product\/[a-z0-9-]+$/.test(pathname) &&
    getProductBySlug(pathname.slice(9))
  ) {
    return {
      path: pathname,
      title: "Tap Rater | " + getProductBySlug(pathname.slice(9))!.title,
    };
  }
  // Group non-product landing pages instead of sending user-controlled path text.
  if (/^\/(category|solutions)\/[a-z0-9-]+$/.test(pathname)) {
    const group = pathname.split("/")[1];
    return { path: `/${group}`, title: `Tap Rater ${group}` };
  }
  return null;
}

// Resolve names from our public catalog, never customer customization or snapshot text.
export function analyticsItemName(itemId: string): string {
  if (itemId === "multi-link-monthly") return "Multi-Link Monthly Service";
  return getProductBySlug(itemId)?.title ?? itemId;
}

export function ecommerceData(items: AnalyticsItem[]): EcommerceData {
  return {
    currency: "USD",
    value:
      Math.round(
        items.reduce((sum, item) => sum + item.price * 100 * item.quantity, 0),
      ) / 100,
    items: items.map((item) => ({ ...item, item_name: analyticsItemName(item.item_id) })),
  };
}

export function cartAnalyticsItems(cart: CartItem[]): AnalyticsItem[] {
  return cart.flatMap((item) => {
    const product = getProductBySlug(item.productId);
    const option = getPurchaseOption(item.optionId ?? "standard_direct");
    if (
      !product ||
      !option ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.quantity > 99
    )
      return [];
    const price = getConfiguredUnitPriceCents(product, option, {
      sizeCode: item.setup?.sizeCode,
      colorCode: item.setup?.colorCode,
    });
    if (price === null || !Number.isSafeInteger(price) || price < 0) return [];
    const result: AnalyticsItem[] = [
      {
        item_id: product.slug,
        item_name: product.title,
        item_variant: option.id,
        price: price / 100,
        quantity: item.quantity,
      },
    ];
    if (
      item.setup?.serviceMode === "HOSTED" &&
      Number.isSafeInteger(item.setup.monthlyPriceCents) &&
      item.setup.monthlyPriceCents! > 0
    ) {
      result.push({
        item_id: "multi-link-monthly",
        item_name: analyticsItemName("multi-link-monthly"),
        item_variant: "subscription",
        price: item.setup.monthlyPriceCents! / 100,
        quantity: item.quantity,
      });
    }
    return result;
  });
}
