import type { MigratedProduct } from "@/data/migrated-products";

export type BrandedCompositionRegion = {
  xPercent: number;
  yPercent: number;
  widthPercent: number;
  heightPercent: number;
};

export type BrandedCompositionGeometry = {
  templateId: string;
  templateVersion: string;
  widthPx: number;
  heightPx: number;
  dpi: number;
  widthIn: number;
  heightIn: number;
  safeMarginPx: number;
  logoRegion: BrandedCompositionRegion;
  businessNameRegion: BrandedCompositionRegion;
  centerAssetRegion: BrandedCompositionRegion;
  ctaRegion: BrandedCompositionRegion;
  qrRegion: BrandedCompositionRegion;
};

export const brandedStandComposition: BrandedCompositionGeometry = {
  templateId: "taprater-branded-stand-front",
  templateVersion: "2026-08-27.1",
  widthPx: 1278,
  heightPx: 1949,
  dpi: 300,
  widthIn: 4.26,
  heightIn: 6.4967,
  safeMarginPx: 64,
  logoRegion: { xPercent: 13, yPercent: 4.5, widthPercent: 74, heightPercent: 9.5 },
  businessNameRegion: { xPercent: 8, yPercent: 17.1, widthPercent: 84, heightPercent: 6.5 },
  centerAssetRegion: { xPercent: 12, yPercent: 29, widthPercent: 76, heightPercent: 18 },
  ctaRegion: { xPercent: 8, yPercent: 49.5, widthPercent: 84, heightPercent: 6.5 },
  qrRegion: { xPercent: 65.2, yPercent: 73.1, widthPercent: 16.2, heightPercent: 10.63 }
};

export function regionToPixels(
  region: BrandedCompositionRegion,
  widthPx = brandedStandComposition.widthPx,
  heightPx = brandedStandComposition.heightPx
) {
  return {
    x: Math.round((region.xPercent / 100) * widthPx),
    y: Math.round((region.yPercent / 100) * heightPx),
    width: Math.round((region.widthPercent / 100) * widthPx),
    height: Math.round((region.heightPercent / 100) * heightPx)
  };
}

export function getCanonicalProductCtaText(
  product: Pick<MigratedProduct, "defaultCtaText" | "displayText" | "primaryPlatformSlug" | "destinationType" | "categorySlug" | "title">
) {
  const explicit = product.defaultCtaText?.trim();
  if (explicit) return explicit;

  const displayText = product.displayText?.trim();
  if (displayText) return displayText;

  if (product.primaryPlatformSlug === "google") return "Review us on Google";
  if (product.destinationType === "booking") return "Book your appointment";
  if (product.categorySlug === "menu") return "View our menu";
  return product.title.replace(/\s+Stand$/i, "");
}
