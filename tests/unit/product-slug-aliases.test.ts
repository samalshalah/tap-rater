import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { migratedProducts } from "@/data/migrated-products";
import { getCanonicalProductSlug, legacyProductSlugAliases } from "@/lib/product-slug-aliases";

describe("product slug aliases", () => {
  it.each([
    ["book-appointment-stand", "book-your-next-visit-stand"],
    ["view-menu-stand", "view-our-menu-stand"],
    ["follow-us-stand", "follow-us-social-media-stand"],
    ["visit-website-stand", "multi-link-stand"],
    ["visit-our-website-stand", "multi-link-stand"]
  ])("resolves legacy %s to canonical active %s", (legacySlug, canonicalSlug) => {
    expect(getCanonicalProductSlug(legacySlug)).toBe(canonicalSlug);
  });

  it.each(["book-your-next-visit-stand", "view-our-menu-stand", "follow-us-social-media-stand", "multi-link-stand"])(
    "keeps canonical product slug %s unchanged",
    (canonicalSlug) => {
      expect(getCanonicalProductSlug(canonicalSlug)).toBe(canonicalSlug);
    }
  );

  it("keeps archived legacy products separate from active canonical products", () => {
    for (const [legacySlug, canonicalSlug] of Object.entries(legacyProductSlugAliases)) {
      const legacyProduct = migratedProducts.find((product) => product.slug === legacySlug);
      const canonicalProduct = migratedProducts.find((product) => product.slug === canonicalSlug);

      expect(legacyProduct?.isActive ?? false).toBe(false);
      expect(canonicalProduct?.isActive).toBe(true);
    }
  });

  it("does not create duplicate active products for archived aliases", () => {
    for (const [legacySlug, canonicalSlug] of Object.entries(legacyProductSlugAliases)) {
      const activeMatchingProducts = migratedProducts.filter(
        (product) => product.isActive && (product.slug === legacySlug || product.slug === canonicalSlug)
      );

      expect(activeMatchingProducts.map((product) => product.slug)).toEqual([canonicalSlug]);
    }
  });

  it("keeps storefront product cards linked to the product slug supplied by the product source", () => {
    const source = readFileSync(join(process.cwd(), "src/components/product/product-card.tsx"), "utf8");

    expect(source).toContain("href={`/product/${product.slug}`}");
    for (const legacySlug of Object.keys(legacyProductSlugAliases)) {
      expect(source).not.toContain(`/product/${legacySlug}`);
    }
  });
});
