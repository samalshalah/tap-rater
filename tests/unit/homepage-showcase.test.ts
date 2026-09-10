import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { migratedProducts } from "@/data/migrated-products";
import { HomepageLayout } from "@/components/storefront/homepage-layout";
import { HomepageBrowseCard } from "@/components/storefront/homepage-browse-card";
import { ProductCard } from "@/components/product/product-card";
import { getProductVisual } from "@/lib/storefront-visuals";
import { defaultHomepageContent } from "@/lib/website-content";
import { defaultHomepageShowcase, homepageShowcaseSchema, selectFeaturedHomepageProducts } from "@/lib/homepage-showcase";
import { getProductPurchaseOptions } from "@/lib/purchase-options";

const google = migratedProducts.find((product) => product.slug === "google-review-stand")!;
const render = (content = structuredClone(defaultHomepageContent), products = migratedProducts) =>
  renderToStaticMarkup(createElement(HomepageLayout, { content, products }));

describe("homepage shopping flow", () => {
  it("renders the nine sections in the agreed order without a second mobile catalog", () => {
    const html = render();
    expect([...html.matchAll(/data-home-section="([^"]+)"/g)].map((match) => match[1]))
      .toEqual(["hero", "actions", "featured", "comparison", "tap", "multilink", "business", "quality", "questions"]);
    expect(html.match(/data-home-featured-products/g)).toHaveLength(1);
    expect(html).not.toContain("Best Sellers");
  });

  it("keeps five real product action images and the Branded checkout intent", () => {
    expect(defaultHomepageContent.actions.items).toHaveLength(5);
    expect(defaultHomepageContent.actions.items.every((item) => item.image.src.includes("/uploads/products/"))).toBe(true);
    const html = render();
    expect(html).toContain('href="/product/google-review-stand?design=branded"');
    expect(html).toContain("NFC-only. No printed QR.");
    expect(html).toContain("Approve the preview before payment");
  });

  it("reuses the original category, business-use and product cards", () => {
    const html = render();
    for (const item of defaultHomepageContent.actions.items) {
      expect(html).toContain(renderToStaticMarkup(createElement(HomepageBrowseCard, {
        href: item.href, title: item.title, description: item.description, image: item.image, variant: "type"
      })));
    }
    for (const scene of defaultHomepageShowcase.scenes) {
      const product = migratedProducts.find((item) => item.slug === scene.productSlug)!;
      expect(html).toContain(renderToStaticMarkup(createElement(HomepageBrowseCard, {
        href: `/solutions/${scene.slug}`, title: scene.title, description: scene.body,
        image: { src: scene.image.src || getProductVisual(product).src, alt: scene.image.alt }, variant: "use-case"
      })));
    }
    for (const product of selectFeaturedHomepageProducts(migratedProducts, defaultHomepageShowcase.featuredProductSlugs)) {
      expect(html).toContain(renderToStaticMarkup(createElement(ProductCard, { product })));
    }
  });

  it("only features configured, active, purchasable inventory and removes duplicates", () => {
    const products = [google, { ...google, slug: "inactive", isActive: false }, { ...google, slug: "disabled", purchaseOptions: [] }];
    expect(selectFeaturedHomepageProducts(products, ["missing", "inactive", "disabled", google.slug, google.slug]).map((product) => product.slug)).toEqual([google.slug]);
  });

  it("fills the default category, product and business rows with five cards", () => {
    expect(defaultHomepageContent.actions.items).toHaveLength(5);
    expect(defaultHomepageShowcase.scenes).toHaveLength(5);
    expect(selectFeaturedHomepageProducts(migratedProducts, defaultHomepageShowcase.featuredProductSlugs)).toHaveLength(5);
    const products = Array.from({ length: 6 }, (_, index) => ({ ...google, slug: `stand-${index}` }));
    expect(selectFeaturedHomepageProducts(products, products.map((product) => product.slug))).toHaveLength(5);
    expect(homepageShowcaseSchema.safeParse({ ...defaultHomepageShowcase, featuredProductSlugs: products.map((product) => product.slug) }).success).toBe(false);
    expect(homepageShowcaseSchema.safeParse({ ...defaultHomepageShowcase, scenes: [...defaultHomepageShowcase.scenes, defaultHomepageShowcase.scenes[0]] }).success).toBe(false);
  });

  it("uses current purchase-option prices in hero and comparison", () => {
    const product = { ...google, purchaseOptions: getProductPurchaseOptions(google).map((option, index) => ({
      ...option, optionCode: option.id, title: option.label, description: option.summary,
      priceCents: option.id === "standard_direct" ? 4300 : 5700,
      requiresFrontProof: option.requiresFinalProof, isActive: true, sortOrder: index
    })) };
    const html = render(structuredClone(defaultHomepageContent), [product]);
    expect(html).toContain("$43");
    expect(html).toContain("$57");
    expect(html).not.toContain("$39");
  });

  it("does not pretend an illustrative still is a real video or customer proof", () => {
    const html = render();
    expect(html).toContain("AI-edited product illustration");
    expect(html).not.toContain("<video");
    expect(html).not.toContain("See an actual tap.");
    expect(html).not.toContain("testimonial");
    expect(html).toContain("Nothing is submitted automatically.");
  });

  it("renders real footage with native, non-autoplay controls and an accessible transcript", () => {
    const content = structuredClone(defaultHomepageContent);
    Object.assign(content.showcase, { tapVideoUrl: "/uploads/tap.mp4", tapPosterUrl: "/uploads/tap.jpg", tapCaptionsUrl: "/uploads/tap.vtt", tapTranscript: "A phone approaches the stand, opens the notification, then shows the review form." });
    const html = render(content);
    expect(html).toContain('controls=""');
    expect(html).toContain('playsInline=""');
    expect(html).toContain('preload="none"');
    expect(html).toContain('kind="captions"');
    expect(html).toContain(content.showcase.tapTranscript);
    expect(html).not.toContain('autoPlay');
    expect(html).toContain("See an actual tap.");
  });

  it("keeps optional media empty until supplied and validates URL protocols", () => {
    expect(homepageShowcaseSchema.safeParse(defaultHomepageShowcase).success).toBe(true);
    expect(defaultHomepageShowcase.tapVideoUrl).toBe("");
    for (const tapVideoUrl of ["javascript:alert(1)", "//example.com/test.mp4", "http://example.com/test.mp4"]) {
      expect(homepageShowcaseSchema.safeParse({ ...defaultHomepageShowcase, tapVideoUrl }).success).toBe(false);
    }
  });
});
