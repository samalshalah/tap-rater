import { describe, expect, it } from "vitest";
import { migratedProducts, type MigratedProduct } from "@/data/migrated-products";
import { getShopResultWindow, searchAndSortShopProducts } from "@/lib/shop-catalog";
import { buildShopHref, normalizeShopQuery } from "@/lib/shop-query";

const google = migratedProducts.find((product) => product.slug === "google-review-stand")!;
const yelp = migratedProducts.find((product) => product.slug === "yelp-review-stand")!;

describe("shop discovery", () => {
  it("matches all search words across catalog fields without depending on case or word order", () => {
    const products = [google, { ...yelp, searchKeywords: ["restaurant feedback"] }];
    const query = normalizeShopQuery({ q: "  FEEDBACK   Yelp  " });
    expect(searchAndSortShopProducts(products, query).map((product) => product.slug)).toEqual([yelp.slug]);
    expect(searchAndSortShopProducts(products, { q: "no-such-product" })).toEqual([]);
  });

  it("preserves merchant ordering for featured products and does not mutate the catalog", () => {
    const products = [yelp, google];
    expect(searchAndSortShopProducts(products, { sort: "featured" })).toEqual(products);
    expect(searchAndSortShopProducts(products, { sort: "name-asc" })).toEqual([google, yelp]);
    expect(products).toEqual([yelp, google]);
  });

  it("sorts by the sellable option price displayed on cards instead of the base price", () => {
    const expensive: MigratedProduct = {
      ...google, slug: "expensive", basePriceCents: 100,
      purchaseOptions: google.purchaseOptions!.map((option) => ({ ...option, priceCents: 7500 })),
    };
    const affordable: MigratedProduct = {
      ...google, slug: "affordable", basePriceCents: 10000,
      purchaseOptions: google.purchaseOptions!.map((option) => ({ ...option, priceCents: 2500 })),
    };
    const quote: MigratedProduct = { ...google, slug: "quote", checkoutMode: "request_quote" };
    const unavailable: MigratedProduct = { ...google, slug: "unavailable", purchaseOptions: [] };
    const products = [quote, expensive, affordable, unavailable];
    expect(searchAndSortShopProducts(products, { sort: "price-asc" }).map((product) => product.slug)).toEqual(["affordable", "expensive", "quote", "unavailable"]);
    expect(searchAndSortShopProducts(products, { sort: "price-desc" }).map((product) => product.slug)).toEqual(["expensive", "affordable", "quote", "unavailable"]);
  });

  it("keeps search and filter values encoded while changing sort or loading more", () => {
    const query = { type: "reviews", use: "healthcare-dental", q: "menu & QR", sort: "price-asc" as const, page: 2 };
    const url = new URL(buildShopHref(query), "https://taprater.com");
    expect(Object.fromEntries(url.searchParams)).toEqual({ type: "reviews", use: "healthcare-dental", q: "menu & QR", sort: "price-asc", page: "2" });
    const removedType = new URL(buildShopHref({ ...query, type: undefined, page: undefined }), url);
    expect(removedType.searchParams.has("type")).toBe(false);
    expect(removedType.searchParams.has("page")).toBe(false);
    expect(removedType.searchParams.get("q")).toBe(query.q);
    expect(removedType.searchParams.get("use")).toBe(query.use);
    expect(removedType.searchParams.get("sort")).toBe(query.sort);
  });

  it("handles repeated and malformed URL parameters with bounded search and sensible defaults", () => {
    expect(normalizeShopQuery({ q: ["  Google  ", "Yelp"], sort: "unknown", page: "NaN" })).toMatchObject({ q: "Google", sort: "featured", page: 1 });
    for (const page of ["-1", "0", "1.5", "Infinity", "9007199254740992"]) {
      expect(normalizeShopQuery({ page }).page).toBe(1);
    }
    expect(normalizeShopQuery({ q: "x".repeat(500) }).q).toHaveLength(120);
    expect(buildShopHref({ sort: "featured", page: 1 })).toBe("/shop");
  });

  it("loads cumulative batches and handles empty results, final batches, and oversized page requests", () => {
    expect(getShopResultWindow(58)).toEqual({ visibleCount: 12, nextPage: 2 });
    expect(getShopResultWindow(58, 2)).toEqual({ visibleCount: 24, nextPage: 3 });
    expect(getShopResultWindow(58, 5)).toEqual({ visibleCount: 58, nextPage: undefined });
    expect(getShopResultWindow(5, 999)).toEqual({ visibleCount: 5, nextPage: undefined });
    expect(getShopResultWindow(0)).toEqual({ visibleCount: 0, nextPage: undefined });
  });
});
