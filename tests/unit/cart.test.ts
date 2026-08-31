import { afterEach, describe, expect, it } from "vitest";
import { calculateCartTotalCents, getCartItemKey, mergeCartItem, normalizeCartItems, parseStoredCart, updateCartQuantity } from "@/lib/cart";

describe("cart utilities", () => {
  afterEach(() => {
    delete process.env.TAP_RATER_ENABLE_HOSTED_PURCHASING;
  });

  it("merges matching products and counts only positive quantities", () => {
    const items = mergeCartItem([{ productId: "google-review-stand", quantity: 1 }], {
      productId: "google-review-stand",
      quantity: 2
    });

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ productId: "google-review-stand", optionId: "standard_direct", quantity: 3 });
  });

  it("prevents quantity updates from going below one", () => {
    const item = normalizeCartItems([{ productId: "google-review-stand", quantity: 1 }])[0];
    const items = updateCartQuantity([item], getCartItemKey(item), -4);

    expect(items[0]).toMatchObject({ productId: "google-review-stand", optionId: "standard_direct", quantity: 1 });
  });

  it("removes stale product ids and invalid quantities from stored carts", () => {
    const items = normalizeCartItems([
      { productId: "google-review-stand", quantity: 2 },
      { productId: "old-product", quantity: 4 },
      { productId: "google-review-plate", quantity: 0 },
      { productId: "", quantity: 3 }
    ]);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ productId: "google-review-stand", optionId: "standard_direct", quantity: 2 });
  });

  it("keeps database-created product items when a product snapshot is present", () => {
    const items = normalizeCartItems([
      {
        productId: "new-database-stand",
        optionId: "branded_qr_direct",
        quantity: 1,
        productSnapshot: {
          title: "New Database Stand",
          sku: "TR-NEW-DATABASE-STAND",
          shortDescription: "Backend-created product"
        }
      }
    ]);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      productId: "new-database-stand",
      optionId: "branded_qr_direct",
      productSnapshot: {
        title: "New Database Stand",
        sku: "TR-NEW-DATABASE-STAND"
      }
    });
  });

  it("rejects snapshot-only Hosted items while Hosted purchasing is disabled", () => {
    process.env.TAP_RATER_ENABLE_HOSTED_PURCHASING = "false";
    const items = normalizeCartItems([
      {
        productId: "new-hosted-stand",
        optionId: "hosted_multilink",
        quantity: 1,
        productSnapshot: {
          title: "New Hosted Stand",
          sku: "TR-NEW-HOSTED-STAND",
          shortDescription: "Backend-created hosted product"
        }
      }
    ]);

    expect(items).toEqual([]);
  });

  it("restores only valid items from localStorage JSON", () => {
    const items = parseStoredCart(
      JSON.stringify([
        { productId: "google-review-stand", quantity: 1 },
        { productId: "old-product", quantity: 3 }
      ])
    );

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ productId: "google-review-stand", optionId: "standard_direct", quantity: 1 });
  });

  it("returns an empty cart when stored JSON is corrupted", () => {
    expect(parseStoredCart("not-json")).toEqual([]);
  });

  it("calculates total using active catalog prices", () => {
    const total = calculateCartTotalCents([
      { productId: "google-review-stand", quantity: 2 },
      { productId: "stale-bundle-product", quantity: 1 }
    ]);

    expect(total).toBe(7800);
  });
});
