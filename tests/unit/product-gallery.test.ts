import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { migratedProducts } from "@/data/migrated-products";
import { galleryImageKey, getGalleryImages } from "@/lib/product-gallery";
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
  it("builds independently selectable panels with only each stand's custom assets", () => {
    for (const product of migratedProducts.filter(p => p.assetSet?.brandedAngledImageUrl && p.slug !== google.slug)) {
      const images = getGalleryImages(product, "branded_qr_direct");
      expect(images.length).toBe(product.assetSet?.brandedFrontTemplateUrl ? 7 : 6);
      expect(new Set(images.map(galleryImageKey)).size).toBe(images.length);
      for (const image of images) {
        expect([product.assetSet!.brandedAngledImageUrl, product.assetSet!.brandedFrontTemplateUrl]).toContain(image.src);
        expect(image.src).not.toBe(product.assetSet!.standardAngledImageUrl);
        expect(image.alt).toContain(product.title);
      }
      expect(images.filter(i => i.panel)).toHaveLength(5);
      expect(images.find(i => i.id === "customize")!.panel!.items[2].body).toContain(product.title.replace(/ Stand$/i, ""));
    }
  });
});
