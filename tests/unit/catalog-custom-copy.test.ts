import { describe, expect, it } from "vitest";
import { migratedProducts } from "@/data/migrated-products";
import { sanitizePublicStorefrontProduct } from "@/lib/product-public-copy";
import { getProductPurchaseOptions } from "@/lib/purchase-options";
import { validateCheckoutCart, buildStripeCheckoutLineItems } from "@/lib/checkout";
import { customStandItem } from "../helpers/custom-stand";

describe("custom-only fallback catalog copy", () => {
  it("removes retired Standard claims from actual checkout line descriptions", () => {
    const cart = validateCheckoutCart([customStandItem()], migratedProducts);
    expect(cart.ok).toBe(true);
    if (!cart.ok) return;
    const description = buildStripeCheckoutLineItems(cart.rows)[0].price_data?.product_data?.description;
    expect(description).not.toMatch(/Standard is NFC-only|Branded adds/);
    expect(description).toContain("Every custom stand includes NFC");
    expect(cart.totalCents).toBe(4900);
  });
  it("describes included NFC and QR without advertising retired Standard options", () => {
    for (const product of migratedProducts.filter((p) => p.isActive && getProductPurchaseOptions(p).length)) {
      const publicProduct = sanitizePublicStorefrontProduct(product);
      expect(publicProduct.shortDescription).toContain("QR");
      expect(publicProduct.description).not.toMatch(/Standard is NFC-only|Branded options add/);
      expect(publicProduct.description).toContain("no subscription");
    }
  });
  it("preserves current merchant-authored database descriptions", () => {
    const product = { ...migratedProducts[0], catalogManaged: true, shortDescription: "Our current custom stand.", description: "Owner-approved product details." };
    expect(sanitizePublicStorefrontProduct(product)).toMatchObject({ shortDescription: product.shortDescription, description: product.description });
  });
});
