import type { CatalogCategory, MigratedProduct } from "@/data/migrated-products";
import type { StandType } from "@/lib/catalog-architecture";
import { getCategoryVisual, getProductVisual } from "@/lib/storefront-visuals";

// Older type thumbnails show retired standard designs (one is also missing).
// Keep explicit new imagery, and use current custom inventory for these defaults.
const legacyImages = new Set([
  "/uploads/products/google-review-stand.png",
  "/uploads/products/social-media-stand.png",
  "/uploads/products/book-next-visit-stand.png",
  "/uploads/products/view-menu-stand.png",
  "/uploads/products/rate-your-experience-stand.png"
]);

export function getStandTypeHeroImage(category: Pick<CatalogCategory, "slug" | "title">, standType: Pick<StandType, "bannerImageUrl" | "imageUrl"> | undefined, products: MigratedProduct[]) {
  const configured = standType?.bannerImageUrl || standType?.imageUrl;
  if (configured && !legacyImages.has(configured) && !configured.includes("-standard-")) return configured;
  const product = products.find(item => item.isActive);
  return product ? getProductVisual(product).src : getCategoryVisual(category).src;
}
