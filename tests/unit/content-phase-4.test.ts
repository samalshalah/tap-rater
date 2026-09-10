import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { migratedProducts } from "@/data/migrated-products";
import { ProductCard } from "@/components/product/product-card";
import { ProductHero } from "@/components/product/product-hero";
import { defaultHomepageContent } from "@/lib/website-content";
import { hostedMultiLinkServiceAddon } from "@/lib/service-addons";
import { formatPrice } from "@/lib/products";
import SupportPage from "@/app/support/page";

const mocks = vi.hoisted(() => ({ product: vi.fn(), related: vi.fn() }));
vi.mock("@/components/cart/cart-provider", () => ({ useCart: () => ({ items: [], addItem: vi.fn() }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), notFound: () => { throw new Error("not found"); }, permanentRedirect: (url: string) => { throw new Error(`redirect:${url}`); } }));
vi.mock("@/lib/product-repository", () => ({ getStorefrontProductBySlug: mocks.product, getRelatedStorefrontProductsForProduct: mocks.related }));
import ProductPage, { generateMetadata } from "@/app/product/[slug]/page";

const product = migratedProducts.find(item => item.slug === "google-review-stand")!;
const renderHero = (initialOptionId?: "branded_qr_direct", candidate = product) => renderToStaticMarkup(createElement(ProductHero, {
  product: candidate, destination: "Google", fromPrice: "$39", initialOptionId
}));
const selectedInput = (html: string, label: string) => html.match(new RegExp(`<input[^>]*aria-label="${label}"[^>]*>`))?.[0];

beforeEach(() => {
  mocks.product.mockResolvedValue(product);
  mocks.related.mockResolvedValue([]);
});

describe("final content and shopping continuity", () => {
  it("keeps Branded shopping intent in the product URL without changing ordinary links", () => {
    expect(renderToStaticMarkup(createElement(ProductCard, { product, design: "branded" }))).toContain('href="/product/google-review-stand?design=branded"');
    expect(renderToStaticMarkup(createElement(ProductCard, { product }))).toContain('href="/product/google-review-stand"');
  });

  it("starts the Branded price, radio control, and gallery together", () => {
    const html = renderHero("branded_qr_direct");
    expect(selectedInput(html, "Select Branded")).toContain('checked=""');
    expect(selectedInput(html, "Select Standard")).not.toContain('checked=""');
    expect(html).toContain("Set Up My Stand - $49");
    expect(html).toContain("Branded + QR layout example");
  });

  it("keeps Standard as the ordinary entry point", () => {
    const html = renderHero();
    expect(selectedInput(html, "Select Standard")).toContain('checked=""');
    expect(html).toContain("Set Up My Stand - $39");
  });

  it("never selects an unavailable Branded option from a query", () => {
    const html = renderHero("branded_qr_direct", { ...product, assetSet: undefined });
    expect(html).toContain("Set Up My Stand - $39");
    expect(html).not.toContain("Set Up My Stand - $49");
  });

  it.each([undefined, "unknown", ["branded", "standard"]])("ignores an invalid or ambiguous design query: %j", async design => {
    const html = renderToStaticMarkup(await ProductPage({ params: Promise.resolve({ slug: product.slug }), searchParams: Promise.resolve({ design }) }));
    expect(html).toContain("Set Up My Stand - $39");
  });

  it("passes a Branded query from the server and retains a query-free canonical", async () => {
    const props = { params: Promise.resolve({ slug: product.slug }), searchParams: Promise.resolve({ design: "branded" }) };
    expect(renderToStaticMarkup(await ProductPage(props))).toContain("Set Up My Stand - $49");
    expect((await generateMetadata(props)).alternates?.canonical).toBe("/product/google-review-stand");
  });

  it.each([undefined, "branded", "unknown"])("preserves only the supported design through an old product link: %j", async design => {
    await expect(ProductPage({ params: Promise.resolve({ slug: "follow-us-stand" }), searchParams: Promise.resolve({ design }) }))
      .rejects.toThrow(`redirect:/product/follow-us-social-media-stand${design === "branded" ? "?design=branded" : ""}`);
  });

  it("advertises the configured recurring price and link limit beside the hosted-page offer", () => {
    expect(defaultHomepageContent.multilink.headline).toContain(`Up to ${hostedMultiLinkServiceAddon.maxLinks} links`);
    expect(defaultHomepageContent.multilink.body).toContain(`${formatPrice(hostedMultiLinkServiceAddon.monthlyPriceCents)}/month per page`);
    expect(defaultHomepageContent.multilink.body).toContain("plus the physical stand price");
    expect(defaultHomepageContent.multilink.cta.href).toBe("/multi-link");
  });

  it("does not promise unconfirmed shipping estimates from support", () => {
    const html = renderToStaticMarkup(createElement(SupportPage));
    expect(html).toContain("Preparation, shipping costs, and order issue support.");
    expect(html).not.toContain("shipping estimates");
  });
});
