import { describe, expect, it } from "vitest";
import { migratedProducts, type MigratedProduct } from "@/data/migrated-products";
import { getConfiguredUnitPriceCents } from "@/lib/product-model";
import { buildStripeCheckoutLineItems, validateCheckoutCart } from "@/lib/checkout";
import { customStandItem } from "../helpers/custom-stand";

const product: MigratedProduct = {
  ...migratedProducts.find((item) => item.slug === "google-review-stand")!,
  sizeOptions: [],
  colorOptions: [
    { code: "white", label: "White", skuSuffix: "W", isDefault: true, isActive: true, priceAdjustmentCents: 0 },
    { code: "black", label: "Black", skuSuffix: "B", isDefault: false, isActive: true, priceAdjustmentCents: 700 },
    { code: "retired", label: "Retired", skuSuffix: "R", isDefault: false, isActive: false, priceAdjustmentCents: 0 },
  ],
};

describe("catalog color pricing without size variants", () => {
  it("preserves a configured color surcharge through cart and Stripe line items", () => {
    expect(getConfiguredUnitPriceCents(product, { priceCents: 4900 }, { colorCode: "black" })).toBe(5600);
    const item = customStandItem();
    item.setup.colorCode = "black";
    const cart = validateCheckoutCart([item], [product]);
    expect(cart.ok).toBe(true);
    if (!cart.ok) return;
    expect(cart.totalCents).toBe(5600);
    expect(buildStripeCheckoutLineItems(cart.rows)[0].price_data?.unit_amount).toBe(5600);
  });

  it("rejects a retired color submitted from a stale cart", () => {
    const item = customStandItem();
    item.setup.colorCode = "retired";
    expect(validateCheckoutCart([item], [product]).ok).toBe(false);
  });

  it("preserves the base price for the default color and products without variants", () => {
    expect(getConfiguredUnitPriceCents(product, { priceCents: 4900 }, {})).toBe(4900);
    expect(getConfiguredUnitPriceCents({}, { priceCents: 4900 }, {})).toBe(4900);
  });
});
