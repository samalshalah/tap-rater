import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { migratedProducts } from "@/data/migrated-products";
import { getGalleryImages } from "@/lib/product-gallery";
import { optimizedUploadSrc } from "@/lib/optimized-upload";

const google = migratedProducts.find(p => p.slug === "google-review-stand")!;
describe("design-specific galleries", () => {
  it("keeps the seven custom images separate from standard and Multi-Link", () => {
    const custom = getGalleryImages(google, "branded_qr_direct");
    expect(custom).toHaveLength(7);
    const standard = getGalleryImages(google, "standard_direct");
    expect(standard[0].src).toBe(google.assetSet!.standardAngledImageUrl);
    for (const image of custom) {
      expect(standard.some(i => i.src === image.src)).toBe(false);
      expect(existsSync(`public${image.src}`)).toBe(true);
      for (const width of [160, 320, 480, 640, 1200] as const) expect(existsSync(`public${optimizedUploadSrc(image.src, width)}`)).toBe(true);
    }
    expect(getGalleryImages(google, "hosted_multilink")[0].src).toBe(google.assetSet!.multiLinkAngledImageUrl);
  });
  it("uses each other existing stand's own custom artwork", () => {
    const yelp = migratedProducts.find(p => p.slug === "yelp-review-stand")!;
    expect(getGalleryImages(yelp, "branded_qr_direct")[0].src).toBe(yelp.assetSet!.brandedAngledImageUrl);
    expect(getGalleryImages({ ...yelp, assetSet: undefined }, "branded_qr_direct")).toEqual([]);
  });
});
