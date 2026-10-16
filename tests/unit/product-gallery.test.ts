import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { migratedProducts } from "@/data/migrated-products";
import customProductGalleries from "@/data/custom-product-galleries.json";
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
    expect(getGalleryImages(yelp, "branded_qr_direct")[0].src).toContain("/custom-v3/yelp-review-stand/");
    expect(getGalleryImages({ ...yelp, slug: "unconfigured", assetSet: undefined }, "branded_qr_direct")).toEqual([]);
  });
  it("keeps each stand's seven raster images separate from standard artwork", () => {
    // The live catalog differs from the legacy seed (for example, LinkedIn Connect).
    for (const product of migratedProducts.filter(p => p.slug in customProductGalleries)) {
      const images = getGalleryImages(product, "branded_qr_direct");
      expect(images.length).toBe(7);
      expect(new Set(images.map(galleryImageKey)).size).toBe(images.length);
      for (const image of images) {
        expect(image.src).toContain(`/custom-v3/${product.slug}/`);
        expect(image.src).not.toBe(product.assetSet!.standardAngledImageUrl);
        expect(image.alt).toContain(product.title);
      }
      expect(images.filter(i => i.panel)).toHaveLength(0);
      const standard = getGalleryImages(product, "standard_direct");
      expect(standard[0].src).toBe(product.assetSet!.standardAngledImageUrl);
      expect(standard.some(i => images.some(c => c.src === i.src))).toBe(false);
    }
  });
  it("ships complete optimized files for all 57 sets including LinkedIn Connect", () => {
    expect(Object.keys(customProductGalleries)).toHaveLength(57);
    expect(customProductGalleries["linkedin-connect-stand"]).toHaveLength(7);
    for (const [slug, images] of Object.entries(customProductGalleries)) {
      expect(images).toHaveLength(7);
      for (const image of images) {
        expect(image.src).toContain(`/custom-v3/${slug}/`);
        expect(existsSync(`public${image.src}`), image.src).toBe(true);
        for (const width of [160, 320, 480, 640, 1200] as const) expect(existsSync(`public${optimizedUploadSrc(image.src, width)}`), `${image.src} width ${width}`).toBe(true);
      }
    }
  });
});
