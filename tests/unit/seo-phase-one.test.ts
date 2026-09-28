import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ProductHero } from "@/components/product/product-hero";
import { migratedProducts, type MigratedProduct } from "@/data/migrated-products";
import { productMatchesCategory } from "@/lib/category-products";
import { normalizeGoogleReviewLink } from "@/lib/google-review";
import { getDefaultPurchasableProductSize } from "@/lib/product-model";
import { breadcrumbJsonLd, JsonLd, productJsonLd } from "@/lib/seo";
import { metadata as setupMetadata } from "@/app/(content)/setup-new-taprater/page";
import { metadata as changeMetadata } from "@/app/(content)/change-taprater-link/page";
import { metadata as reviewToolMetadata } from "@/app/(content)/review-links-generator/page";

const google = migratedProducts.find((product) => product.slug === "google-review-stand")!;
const connect = migratedProducts.find((product) => product.slug === "connect-with-us-stand")!;
const feedback = migratedProducts.find((product) => product.slug === "rate-your-experience-stand")!;
const schema = (product: MigratedProduct) => productJsonLd(product) as Record<string, any>;

vi.mock("@/components/product/product-gallery", () => ({ ProductGallery: () => null }));
vi.mock("@/components/product/product-setup-chooser", () => ({ ProductSetupChooser: () => null }));

describe("category membership", () => {
  it("includes relevant secondary uses without changing the primary category", () => {
    expect(productMatchesCategory(connect, "appointments")).toBe(true);
    expect(productMatchesCategory(connect, "website-links")).toBe(true);
    expect(productMatchesCategory({ ...feedback, categorySlug: "reviews" }, "feedback")).toBe(true);
    expect(productMatchesCategory(google, "appointments")).toBe(false);
    expect(connect.categorySlug).toBe("website-links");
  });

  it.each([
    { isActive: false }, { status: "draft" }, { status: "archived" }, { stockStatus: "outofstock" }
  ] as Partial<MigratedProduct>[])("does not resurrect unavailable products: %j", (overrides) => {
    expect(productMatchesCategory({ ...connect, ...overrides }, "appointments")).toBe(false);
  });

  it("uses sellable branded options for the custom shop filter", () => {
    expect(productMatchesCategory(google, "custom-stands")).toBe(true);
    expect(productMatchesCategory({ ...google, purchaseOptions: [] }, "custom-stands")).toBe(false);
    expect(productMatchesCategory({ ...google, assetSet: {} }, "custom-stands")).toBe(false);
  });
});

describe("product variant structured data", () => {
  it("advertises the actual Standard and Branded prices with selectable URLs and distinct SKUs", () => {
    const data = schema(google);
    expect(data["@type"]).toBe("ProductGroup");
    expect(data.productGroupID).toBeTruthy();
    expect(data.offers).toBeUndefined();
    expect(data.hasVariant).toHaveLength(2);
    expect(data.hasVariant.map((variant: any) => variant.offers.price)).toEqual(["39.00", "49.00"]);
    expect(new Set(data.hasVariant.map((variant: any) => variant.sku)).size).toBe(2);
    for (const [index, variant] of data.hasVariant.entries()) {
      expect(new URL(variant.url).searchParams.get("design")).toBe(index ? "branded" : "standard");
      expect(variant.offers.url).toBe(variant.url);
      expect(variant.offers.priceCurrency).toBe("USD");
      expect(variant.offers.availability).toBe("https://schema.org/InStock");
      expect(variant.image.length).toBeGreaterThan(0);
      expect(variant.aggregateRating).toBeUndefined();
    }
    expect(data.hasVariant[1].image[0]).toContain(google.assetSet!.brandedAngledImageUrl);
  });

  it("uses admin prices and never restores disabled options", () => {
    const product = { ...google, purchaseOptions: google.purchaseOptions!.map((option) => ({
      ...option, isActive: option.optionCode === "branded_qr_direct", priceCents: 5900
    })) };
    expect(schema(product)).toMatchObject({ "@type": "Product", offers: { price: "59.00" } });
    expect(schema(product).url).toContain("?design=branded");
    expect(schema({ ...google, purchaseOptions: [] })).not.toHaveProperty("offers");
    expect(schema({ ...google, purchaseOptions: [] })).not.toHaveProperty("hasVariant");
  });

  it("matches the chooser's purchasable size and color adjustments", () => {
    const size = {
      code: "small", label: "Small", frontWidthMm: 108, frontHeightMm: 165, frontWidthIn: 4.25,
      frontHeightIn: 6.5, baseDepthMm: 50, baseDepthIn: 1.97, skuSuffix: "S", priceAdjustmentCents: 500,
      isDefault: false, isActive: true
    };
    const product = { ...google, sizeOptions: [
      { ...size, code: "quote", skuSuffix: "Q", isDefault: true, priceAdjustmentCents: null }, size
    ], colorOptions: [{ code: "white", label: "White", skuSuffix: "W", priceAdjustmentCents: 200, isDefault: true, isActive: true }] };
    expect(getDefaultPurchasableProductSize(product)?.code).toBe("small");
    expect(schema(product).hasVariant[0]).toMatchObject({ offers: { price: "46.00" } });
    expect(schema(product).hasVariant[0].sku).toMatch(/-S-W$/);
    const html = renderToStaticMarkup(createElement(ProductHero, { product, destination: "Google", fromPrice: "$39", initialOptionId: "standard_direct" }));
    expect(html).toContain("$46");
    expect(html).not.toContain("$39");
    expect(schema({ ...product, sizeOptions: [product.sizeOptions[0]] })).not.toHaveProperty("hasVariant");
  });

  it("does not advertise an instant-purchase offer for quote-only or subscription products", () => {
    for (const checkoutMode of ["request_quote", "subscription", "contact_sales"] as const) {
      const data = schema({ ...google, checkoutMode });
      expect(data.offers).toBeUndefined();
      expect(data.hasVariant).toBeUndefined();
    }
  });

  it("marks unavailable variants out of stock", () => {
    expect(schema({ ...google, stockStatus: "outofstock" }).hasVariant[0].offers.availability).toBe("https://schema.org/OutOfStock");
  });

  it("creates ordered canonical breadcrumbs and escapes script markup", () => {
    const data = breadcrumbJsonLd([{ name: "Shop", href: "/shop" }, { name: "Reviews", href: "/category/reviews" }]);
    expect(data.itemListElement.map((item) => item.position)).toEqual([1, 2]);
    expect(new URL(data.itemListElement[1].item).pathname).toBe("/category/reviews");
    expect(JsonLd({ data: { name: "</script><script>alert(1)</script>" } }).props.dangerouslySetInnerHTML.__html).not.toContain("<");
  });
});

describe("public review-link tool and utility indexing", () => {
  it.each([
    "https://search.google.com/local/writereview?placeid=ChIJtest",
    "https://www.google.com/local/writereview?placeid=ChIJtest",
    "https://g.page/r/valid-place/review"
  ])("allows a Google review link: %s", (url) => {
    expect(normalizeGoogleReviewLink(` ${url} `)).toBe(url);
  });

  it.each([
    "", "javascript:alert(1)", "http://g.page/r/id/review", "https://google.com.evil.test/local/writereview?placeid=id",
    "https://user:password@g.page/r/id/review", "https://search.google.com/local/writereview", "https://example.com/review",
    "https://g.page/r/id/review/extra", "https://search.google.com:8443/local/writereview?placeid=id"
  ])("rejects an unrelated or unsafe link: %s", (url) => {
    expect(normalizeGoogleReviewLink(url)).toBeUndefined();
  });

  it("keeps account utility forms out of search while restoring the useful legacy tool", () => {
    expect(setupMetadata.robots).toEqual({ index: false, follow: true });
    expect(changeMetadata.robots).toEqual({ index: false, follow: true });
    expect(reviewToolMetadata.alternates?.canonical).toBe("/review-links-generator");
    expect(reviewToolMetadata.robots).toBeUndefined();
  });
});
