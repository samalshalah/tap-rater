import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { migratedProducts, type MigratedProduct } from "@/data/migrated-products";
import { generateProductSeo, resolveProductSeo } from "@/lib/product-seo";

const googleProduct = migratedProducts.find((product) => product.slug === "google-review-stand");

function productFixture(overrides: Partial<MigratedProduct> = {}): MigratedProduct {
  if (!googleProduct) {
    throw new Error("Missing Google Review Stand fixture.");
  }

  return {
    ...googleProduct,
    standTypeSlug: "review-stands",
    primaryPlatformSlug: "google",
    destinationType: "review",
    businessUseSlugs: ["restaurant-food"],
    productKind: "normal_direct",
    requiresSubscription: false,
    requiresLandingPage: false,
    isSpecialSolution: false,
    seoTitle: undefined,
    seoDescription: undefined,
    ...overrides
  };
}

describe("product SEO generation", () => {
  it("generates product metadata from stand type, platform, use, and price", () => {
    const seo = generateProductSeo(productFixture());

    expect(seo.generatedTitle).toBe("Google Review Stand | NFC Review Stand from $39");
    expect(seo.generatedDescription).toBe(
      "Get more Google reviews with a Tap Rater NFC review stand. Order a ready-made direct stand. Starts at $39."
    );
    expect(seo.generatedTitle.length).toBeLessThanOrEqual(64);
    expect(seo.generatedDescription.length).toBeLessThanOrEqual(158);
    expect(`${seo.generatedTitle} ${seo.generatedDescription}`).not.toMatch(/undefined|null/);
  });

  it("generates booking metadata without turning the platform into a stand type", () => {
    const seo = generateProductSeo(
      productFixture({
        title: "Book Appointment Stand",
        categorySlug: "appointments",
        standTypeSlug: "appointment-reservation-stands",
        primaryPlatformSlug: "vagaro",
        destinationType: "booking",
        businessUseSlugs: ["beauty-salon-wellness"],
        supportedDestinations: ["vagaro"]
      })
    );

    expect(seo.generatedTitle).toBe("Book Appointment Stand | NFC Booking Stand from $39");
    expect(seo.generatedDescription).toBe(
      "Let customers book appointments with one tap. Works with booking links like Vagaro, Booksy, Fresha, Calendly, Zocdoc, or any booking URL. Starts at $39."
    );
    expect(seo.generatedDescription).not.toContain("Vagaro Stand");
  });

  it("generates menu metadata without overlong wording", () => {
    const seo = generateProductSeo(
      productFixture({
        title: "View Menu Stand",
        categorySlug: "menu",
        standTypeSlug: "menu-info-stands",
        primaryPlatformSlug: "custom-menu-url",
        destinationType: "menu",
        supportedDestinations: ["custom-menu-url"]
      })
    );

    expect(seo.generatedTitle).toBe("View Menu Stand | NFC Menu Stand from $39");
    expect(seo.generatedDescription).toBe(
      "Let customers open your menu with one tap. Order a ready-made direct stand. Starts at $39."
    );
    expect(seo.generatedDescription.length).toBeLessThanOrEqual(158);
  });

  it("uses custom admin overrides when provided", () => {
    const seo = resolveProductSeo(
      productFixture({
        seoTitle: "Best Google Review Counter Stand | Tap Rater",
        seoDescription: "Custom description for a specific paid landing page."
      })
    );

    expect(seo.title).toBe("Best Google Review Counter Stand");
    expect(seo.description).toBe("Custom description for a specific paid landing page.");
    expect(seo.generatedTitle).not.toBe(seo.title);
    expect(seo.isTitleCustom).toBe(true);
    expect(seo.isDescriptionCustom).toBe(true);
  });

  it("generates special hosted multi-link metadata separately from direct stands", () => {
    const seo = generateProductSeo(
      productFixture({
        title: "Hosted Multi-Link Stand",
        categorySlug: "custom-stands",
        standTypeSlug: "custom-stands",
        primaryPlatformSlug: "custom-url",
        destinationType: "custom",
        productKind: "hosted_multilink",
        requiresSubscription: true,
        requiresLandingPage: true,
        isSpecialSolution: true,
        basePriceCents: 4900
      })
    );

    expect(seo.generatedTitle).toBe("Hosted Multi-Link Stand | Branded QR Landing Page Stand");
    expect(seo.generatedDescription).toBe(
      "Get a branded stand with QR and a hosted Tap Rater landing page for up to 10 links. Monthly hosting keeps links managed. Starts at $49."
    );
  });

  it("uses resolved SEO in product structured data", () => {
    const source = readFileSync(join(process.cwd(), "src/lib/seo.tsx"), "utf8");

    expect(source).toContain('import { resolveProductSeo } from "@/lib/product-seo";');
    expect(source).toContain("const seo = resolveProductSeo(product);");
    expect(source).toContain("description: seo.description");
  });
});
