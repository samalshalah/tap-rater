import type { CatalogCategory, CatalogCategorySlug, MigratedProduct } from "@/data/migrated-products";
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

type CountertopImage = {
  src: string;
  alt: string;
  fit: "cover";
  placement: "right";
};

export const googleReviewCountertop: CountertopImage = {
  src: "/product-galleries/google-custom/tap-rater-custom-google-review-stand-05-countertop-scene.webp",
  alt: "Custom Google review stand on a countertop",
  fit: "cover",
  placement: "right"
};

const categoryCountertops: Partial<Record<CatalogCategorySlug, CountertopImage>> = {
  reviews: googleReviewCountertop,
  "social-media": {
    src: "/product-galleries/custom-v3/follow-us-social-media-stand/05-countertop-scene.webp",
    alt: "Follow Us on Social Media NFC stand on a countertop",
    fit: "cover",
    placement: "right"
  },
  appointments: {
    src: "/product-galleries/custom-v3/connect-with-us-stand/05-countertop-scene.webp",
    alt: "Connect With Us NFC stand on a countertop",
    fit: "cover",
    placement: "right"
  },
  menu: {
    src: "/product-galleries/custom-v3/menu-and-order-stand/05-countertop-scene.webp",
    alt: "Menu and Order NFC stand on a countertop",
    fit: "cover",
    placement: "right"
  },
  feedback: {
    src: "/product-galleries/custom-v3/rate-your-experience-stand/05-countertop-scene.webp",
    alt: "Rate Your Experience NFC stand on a countertop",
    fit: "cover",
    placement: "right"
  }
};

export function getStandTypeHeroImage(category: Pick<CatalogCategory, "slug" | "title">, standType: Pick<StandType, "bannerImageUrl" | "imageUrl"> | undefined, products: MigratedProduct[]) {
  const configured = standType?.bannerImageUrl || standType?.imageUrl;
  if (configured && !legacyImages.has(configured) && !configured.includes("-standard-")) {
    return {
      src: configured,
      alt: category.title,
      fit: standType?.bannerImageUrl ? "cover" as const : "contain" as const
    };
  }
  const scene = categoryCountertops[category.slug];
  if (scene) return scene;

  const product = products.find((item) => item.isActive);
  return product ? getProductVisual(product) : getCategoryVisual(category);
}
