import type { MigratedProduct } from "@/data/migrated-products";
import type { PurchaseOptionId } from "@/lib/purchase-options";
import { getProductVisual } from "@/lib/storefront-visuals";

export type GalleryImage = { src: string; alt: string; caption?: string };

// Add approved images for an existing product/option here. Never reuse another
// stand's artwork or put custom photographs in the standard gallery.
export const productGalleries: Record<string, Partial<Record<PurchaseOptionId, GalleryImage[]>>> = {
  "google-review-stand": {
    branded_qr_direct: [
      ["01-white-background-angled", "Custom Google Review stand with red logo, company name and QR placeholders", "Custom Google stand — personalized with your logo, business name and review QR code."],
      ["02-customization-steps", "How to personalize the Google stand with your business details", "Add your logo, business name and Google review link."],
      ["03-front-product", "Front view of the custom Google Review stand", "Front view of the custom design."],
      ["04-tap-or-scan", "NFC tap and QR scan options on the custom Google stand", "Customers can tap with NFC or scan your printed QR code."],
      ["05-countertop-scene", "Custom Google Review stand illustrated on a reception counter", "Illustrative countertop setting."],
      ["06-acrylic-detail", "Rounded corners and base of the custom acrylic Google stand", "A closer look at the acrylic stand and countertop base."],
      ["07-personalization-detail", "Logo, business name and review QR customization areas", "Red placeholders show where your business details will go; they are replaced on your finished stand."]
    ].map(([name, alt, caption]) => ({ src: `/product-galleries/google-custom/tap-rater-custom-google-review-stand-${name}.webp`, alt, caption }))
  }
};

export function getGalleryImages(product: MigratedProduct, optionId: PurchaseOptionId = "standard_direct"): GalleryImage[] {
  const configured = productGalleries[product.slug]?.[optionId];
  if (configured?.length) return configured;
  const assets = product.assetSet;
  if (optionId === "branded_qr_direct" || optionId === "hosted_multilink") {
    const src = optionId === "hosted_multilink" ? assets?.multiLinkAngledImageUrl : assets?.brandedAngledImageUrl;
    // No standard-photo fallback: it would misrepresent the selected design.
    return src ? [{ src, alt: `${product.title} ${optionId === "hosted_multilink" ? "Multi-Link" : "custom"} design`, caption: "Personalized layout example." }] : [];
  }
  const excluded = new Set([assets?.standardFrontTemplateUrl, assets?.brandedFrontTemplateUrl, assets?.multiLinkFrontTemplateUrl,
    assets?.brandedAngledImageUrl, assets?.multiLinkAngledImageUrl].filter(Boolean));
  const main = assets?.standardAngledImageUrl ? { src: assets.standardAngledImageUrl, alt: `${product.title} standard design` } : getProductVisual(product);
  const seen = new Set<string>();
  return [main, ...product.images].filter(item => {
    if (!item.src || excluded.has(item.src) || seen.has(item.src)) return false;
    seen.add(item.src);
    return true;
  }).map((item, index) => ({ ...item, alt: item.alt.trim() || `${product.title} gallery view ${index + 1}` }));
}
