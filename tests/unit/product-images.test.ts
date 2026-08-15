import { describe, expect, it } from "vitest";
import { getPrimaryProductImage, PRODUCT_IMAGE_FALLBACK_PATH } from "@/lib/product-images";

describe("product image helpers", () => {
  it("returns the first product image when one exists", () => {
    expect(
      getPrimaryProductImage({
        title: "Google Review Stand",
        images: [{ src: "/uploads/products/google-review-stand.png", alt: "Google Review Stand" }]
      })
    ).toEqual({ src: "/uploads/products/google-review-stand.png", alt: "Google Review Stand" });
  });

  it("uses the shared fallback path with product-specific alt text", () => {
    expect(
      getPrimaryProductImage({
        title: "Future Stand",
        images: []
      })
    ).toEqual({ src: PRODUCT_IMAGE_FALLBACK_PATH, alt: "Future Stand" });
  });
});
