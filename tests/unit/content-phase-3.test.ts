import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { migratedProducts } from "@/data/migrated-products";
import { ProductCard } from "@/components/product/product-card";
import { ProductGallery, getGalleryImages } from "@/components/product/product-gallery";
import { PageHero } from "@/components/storefront/section";
import { multiLinkDemoImage } from "@/lib/marketing-images";
import { defaultHomepageContent } from "@/lib/website-content";
import { lockedStandTypes } from "@/lib/catalog-architecture";
import { correctKnownPurchaseCopy } from "@/lib/purchase-options";
import { getBusinessUsePageCopy } from "@/lib/business-use-content";

const product = migratedProducts.find(item => item.slug === "google-review-stand")!;

describe("content phase 3 presentation standard", () => {
  it("removes a repeated category intro while retaining additional merchant copy", () => {
    const intro = "Stands that send customers to a review destination.";
    expect(getBusinessUsePageCopy({ description: intro, longContent: `${intro}\n\nMerchant details.` })).toEqual({ intro, body: "Merchant details." });
    const source = readFileSync("src/app/category/[slug]/page.tsx", "utf8");
    expect(source).toContain("getBusinessUsePageCopy({ description, longContent: activeStandType.longContent })");
    expect(source).toContain("{copy.body}");
  });

  it("corrects the observed legacy Yelp claim without rewriting merchant-authored text", () => {
    expect(correctKnownPurchaseCopy("Countertop NFC and QR stand that opens your Yelp review destination.")).toContain("Standard is NFC-only; Branded adds a printed QR code.");
    const custom = "Our Branded NFC and QR stand supports this business.";
    expect(correctKnownPurchaseCopy(custom)).toBe(custom);
  });

  it("uses the catalog card treatment by default, with natural title wrapping", () => {
    const html = renderToStaticMarkup(createElement(ProductCard, { product: { ...product, title: "A long product name that must not be clipped" } }));
    expect(html).toContain("tr-product-card");
    expect(html).toContain("rounded-lg");
    expect(html).toContain("aspect-square");
    expect(html).toContain("[overflow-wrap:anywhere]");
    expect(html).toContain("mt-auto text-sm");
    expect(html).not.toContain("aspect-[4/5]");
    expect(html).not.toContain("line-clamp");
    expect(html).toContain("From $39");
  });

  it("identifies a Standard photo when advertising the available Branded price", () => {
    const html = renderToStaticMarkup(createElement(ProductCard, { product, design: "branded" }));
    expect(html).toContain("Standard design shown");
    expect(html).toContain("Branded + QR: $49");
    const merchantPhoto = { ...product, images: [{ src: "/uploads/custom-scene.png", alt: "Custom scene" }] };
    expect(renderToStaticMarkup(createElement(ProductCard, { product: merchantPhoto, design: "branded" }))).not.toContain("Standard design shown");
  });

  it.each(["category/[slug]", "solutions/[slug]", "product/[slug]", "multi-link"])("uses shared listing tracks on %s", route => {
    const source = readFileSync(`src/app/${route}/page.tsx`, "utf8");
    expect(source).toContain("tr-product-grid");
    expect(source).not.toContain("[&_>_a>div:first-child]");
    expect(source).not.toContain("max-w-[600px]");
  });

  it("uses the same finished demonstration asset in the homepage and category defaults", () => {
    expect(defaultHomepageContent.multilink.image.src).toBe(multiLinkDemoImage.src);
    expect(lockedStandTypes.find(item => item.slug === "website-link-stands")?.imageUrl).toBe(multiLinkDemoImage.src);
    expect(multiLinkDemoImage.alt).toContain("Illustrative");
    expect(multiLinkDemoImage.alt).toContain("Bingo Tires");
    const homepage = readFileSync("src/app/page.tsx", "utf8");
    expect(homepage).toContain("content.image.src === multiLinkDemoImage.src ? <figcaption");
    const manifest = JSON.parse(readFileSync("public/uploads-optimized/manifest.json", "utf8"));
    expect(manifest.sources["marketing/multi-link-bingo-tires-demo.png"]).toMatch(/^[a-f0-9]{64}$/);
  });

  it("renders an optional image caption and bounded category spacing", () => {
    const html = renderToStaticMarkup(createElement(PageHero, { title: "Multi-Link", spacing: "compact", image: multiLinkDemoImage }));
    expect(html).toContain("tr-section-compact");
    expect(html).toContain("<figcaption");
    expect(html).toContain(multiLinkDemoImage.caption);
    expect(renderToStaticMarkup(createElement(PageHero, { title: "Custom merchant image", image: { src: "/custom.png", alt: "Merchant image" } }))).not.toContain("<figcaption");
  });

  it("respects saved gallery photos, removes duplicate images, and excludes production templates", () => {
    const images = getGalleryImages({ ...product, images: [
      ...product.images,
      { src: product.assetSet!.standardFrontTemplateUrl!, alt: "Legacy template with QR placeholder" },
      { src: product.assetSet!.brandedFrontTemplateUrl!, alt: "Production template" },
      { src: "/uploads/gallery/detail.png", alt: "Stand detail" },
      { src: "/uploads/gallery/detail.png", alt: "Duplicate" },
      { src: "/uploads/gallery/scale.png", alt: "" }
    ] });
    expect(images.filter(item => item.src === "/uploads/gallery/detail.png")).toHaveLength(1);
    expect(images.find(item => item.src === "/uploads/gallery/detail.png")?.alt).toBe("Stand detail");
    expect(images.find(item => item.src === "/uploads/gallery/scale.png")?.alt).toContain("gallery view");
    expect(images.some(item => item.src === product.assetSet!.standardFrontTemplateUrl)).toBe(false);
    expect(images.some(item => item.src === product.assetSet!.brandedFrontTemplateUrl)).toBe(false);
    expect(images.find(item => item.src === product.assetSet!.brandedAngledImageUrl)?.caption).toBe("Branded + QR layout example");
  });

  it("announces the selected thumbnail and labels a Branded layout without shifting the image frame", () => {
    const html = renderToStaticMarkup(createElement(ProductGallery, { product, selectedOptionId: "branded_qr_direct" }));
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain("min-w-full");
    expect(html).toContain("Branded + QR layout example");
    expect(html).toContain("min-h-5");
  });
});
