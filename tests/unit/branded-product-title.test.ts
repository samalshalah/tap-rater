import { describe, expect, it } from "vitest";
import { brandedProductTitle, brandedProductSeoTitle, shortProductTitle } from "@/lib/branded-product-title";
import { migratedProducts } from "@/data/migrated-products";

describe("public product naming", () => {
  it("normalizes raw and previously branded names without repeating the suffix", () => {
    const title = "Custom Google Review Stand with Your Logo \u2014 NFC + QR";
    for (const input of ["Tap Rater Review Stand for Google Reviews", "Tap Rater Branded QR Review Stand for Google Reviews", title]) {
      expect(brandedProductTitle(input)).toBe(title);
      expect(shortProductTitle(input)).toBe("Custom Google Review Stand");
      expect(brandedProductSeoTitle(input)).toBe("Custom Google Review Stand with Logo, NFC & QR");
    }
  });
  it("keeps normalization stable across the catalog without mutating stored names", () => {
    for (const product of migratedProducts) {
      const original = product.title;
      const named = brandedProductTitle(original);
      expect(brandedProductTitle(named)).toBe(named);
      expect(shortProductTitle(named)).not.toContain("with Your Logo");
      expect(product.title).toBe(original);
    }
  });
});
