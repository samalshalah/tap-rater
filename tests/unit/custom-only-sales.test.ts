import { describe, expect, it } from "vitest";
import { migratedProducts } from "@/data/migrated-products";
import { getProductPurchaseOptions, getPurchaseOption } from "@/lib/purchase-options";
import { normalizeCartItems } from "@/lib/cart";
import { validateCheckoutCart } from "@/lib/checkout";
import { getOrderStandardDesignUrl } from "@/lib/order-design-assets";
import { buildMerchantFeed } from "@/lib/merchant-feed";
import { productJsonLd } from "@/lib/seo";
import { defaultOffers } from "@/lib/offers";
import { customOnlyPublicContent } from "@/lib/custom-only-public-content";
import { customStandItem } from "../helpers/custom-stand";
import type { OrderLineItem } from "@/lib/orders";

const google = migratedProducts.find(p => p.slug === "google-review-stand")!;
describe("custom-only sales with historical orders", () => {
  it("never sells standard even if database flags enable it", () => {
    for (const product of migratedProducts) expect(getProductPurchaseOptions(product).every(o => o.id === "branded_qr_direct")).toBe(true);
    expect(getProductPurchaseOptions({ ...google, assetSet: {} })).toEqual([]);
  });
  it("rejects standard carts, snapshot-only carts, implicit old defaults and mixed checkout requests", () => {
    const retired = { productId: google.slug, optionId: "standard_direct" as const, quantity: 1, setup: { destinationUrl: "https://example.com" } };
    expect(normalizeCartItems([retired, { ...retired, productId: "database-only", productSnapshot: { title: "Old", sku: "OLD", shortDescription: "Old stand" } }, { productId: google.slug, quantity: 1 }])).toEqual([]);
    expect(validateCheckoutCart([retired], [google]).ok).toBe(false);
    expect(validateCheckoutCart([customStandItem(), retired], [google]).ok).toBe(false);
  });
  it("accepts approved custom artwork and requires a logo and current proof", () => {
    expect(validateCheckoutCart([customStandItem()], [google])).toMatchObject({ ok: true, totalCents: 4900 });
    for (const changes of [{ logoMediaUrl: undefined }, { proofApproved: false }, { proofReceiptId: undefined }]) {
      const item = customStandItem(); Object.assign(item.setup, changes);
      expect(validateCheckoutCart([item], [google]).ok).toBe(false);
    }
  });
  it("preserves the old order type and standard production artwork", () => {
    expect(getPurchaseOption("standard_direct")).toMatchObject({ hasQr: false, requiresLogo: false, priceCents: 3900 });
    expect(getOrderStandardDesignUrl({ productId: google.slug, optionId: "standard_direct" } as OrderLineItem)).toBe(google.assetSet?.standardFrontTemplateUrl);
  });
  it("publishes only the custom offer in feeds and structured data", () => {
    const feed = buildMerchantFeed([google], defaultOffers);
    expect(feed).not.toMatch(/design=standard|SECOND-STANDARD|NFC-only/);
    expect(feed.match(/<item>/g)).toHaveLength(1);
    const data = productJsonLd(google) as any;
    expect(data["@type"]).toBe("Product"); expect(data.sku).toContain("BRD"); expect(data.hasVariant).toBeUndefined();
  });
  it("migrates old CMS claims while preserving layout settings and merchant wording", () => {
    const content = { enabled: false, order: 42, body: "Standard is NFC-only; Branded adds printed QR, your logo, and business name.", custom: "Our reception desk opens at 8.", href: "/contact-us" };
    const result = customOnlyPublicContent(content);
    expect(result).toMatchObject({ enabled: false, order: 42, custom: content.custom, href: content.href });
    expect(result.body).not.toContain("Standard"); expect(content.body).toContain("Standard");
  });
});
