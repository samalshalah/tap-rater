import { describe, expect, it, vi } from "vitest";
import { migratedProducts } from "@/data/migrated-products";
import { defaultOffers } from "@/lib/offers";
import { buildMerchantFeed } from "@/lib/merchant-feed";

const product = migratedProducts.find((p) => p.slug === "google-review-stand")!;

describe("Google Merchant feed", () => {
  it("uses the exact storefront title without an additional customization suffix", () => {
    const title = "Custom Google Review Stand with Your Logo — NFC + QR";
    for (const input of [product, { ...product, title }]) {
      const feed = buildMerchantFeed([input], defaultOffers);
      expect(feed).toContain(`<g:title>${title}</g:title>`);
      expect(feed).not.toContain(" - Custom Logo + QR");
    }
  });
  it("removes the retired standard campaign and feed entries", () => {
    for (const date of ["2026-10-12", "2026-11-10"]) {
      const feed = buildMerchantFeed([product], defaultOffers, Date.parse(date));
      expect(feed).not.toContain("design=standard");
      expect(feed).not.toContain("g:promotion_id");
      expect(feed.match(/<item>/g)).toHaveLength(1);
    }
  });
  it("preserves existing IDs, design landing links, live discounts and branded return labels", () => {
    const feed = buildMerchantFeed([product], defaultOffers);
    expect(feed).toContain("<g:id>TR-GOOGLE-REV-ST_tr-google-rev-st-brd</g:id>");
    expect(feed).not.toContain("?design=standard</g:link>");
    expect(feed).toContain("?design=branded</g:link>");
    expect(feed).toContain("<g:price>49.00 USD</g:price>");
    expect(feed).toContain("<g:sale_price>46.00 USD</g:sale_price>");
    expect(feed.match(/<g:return_policy_label>/g)).toHaveLength(1);
    expect(feed).toContain("custom-branded</g:return_policy_label>");
    expect(feed).not.toContain("g:item_group_id");
    expect(feed).not.toContain("g:gtin");
  });

  it("excludes draft, test, quote-only and subscription products and inactive designs", () => {
    const feed = buildMerchantFeed([product,
      { ...product, slug: "qa-example" },
      { ...product, slug: "draft", status: "draft" },
      { ...product, slug: "inactive", isActive: false },
      { ...product, slug: "hosted", requiresSubscription: true },
    ], defaultOffers);
    expect(feed.match(/<item>/g)).toHaveLength(1);
    const standardOnly = { ...product, purchaseOptions: product.purchaseOptions!.map((o) => ({ ...o, isActive: o.optionCode === "standard_direct" })) };
    expect(() => buildMerchantFeed([standardOnly], defaultOffers)).toThrow("empty");
  });

  it("escapes XML, follows disabled offers and refuses destructive empty or duplicate snapshots", () => {
    const feed = buildMerchantFeed([{ ...product, title: 'Review & <Visit> "Stand"' }], { ...defaultOffers, enabled: false });
    expect(feed).toContain("Review &amp; &lt;Visit&gt; &quot;Stand&quot;");
    expect(feed).not.toContain("g:sale_price");
    expect(() => buildMerchantFeed([], defaultOffers)).toThrow("empty");
    expect(() => buildMerchantFeed([product, product], defaultOffers)).toThrow("duplicate");
  });
});

vi.mock("@/lib/offer-settings", () => ({ getOffersSettings: vi.fn() }));
vi.mock("@/lib/product-repository", async (original) => ({
  ...await original<typeof import("@/lib/product-repository")>(), getCheckoutProducts: vi.fn(),
}));

describe("feed endpoint availability", () => {
  it("returns 503 rather than a successful empty feed when storage fails", async () => {
    const { getCheckoutProducts } = await import("@/lib/product-repository");
    const { getOffersSettings } = await import("@/lib/offer-settings");
    vi.mocked(getOffersSettings).mockResolvedValue(defaultOffers);
    vi.mocked(getCheckoutProducts).mockRejectedValue(new Error("storage down"));
    const { GET } = await import("@/app/merchant-feed.xml/route");
    expect((await GET()).status).toBe(503);
    vi.mocked(getCheckoutProducts).mockResolvedValue([product]);
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("application/xml");
    expect(await response.text()).toContain("<rss");
  });
});
