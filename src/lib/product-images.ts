import type { MigratedProduct } from "@/data/migrated-products";

export type ProductImage = {
  src: string;
  alt: string;
};

export const PRODUCT_IMAGE_FALLBACK_PATH = "/uploads/products/no-photo-available.png";
export const PRODUCT_IMAGE_FALLBACK_ALT = "Product image coming soon";

export const productImageFallback: ProductImage = {
  src: PRODUCT_IMAGE_FALLBACK_PATH,
  alt: PRODUCT_IMAGE_FALLBACK_ALT
};

export function getPrimaryProductImage(product: Pick<MigratedProduct, "title" | "images">): ProductImage {
  return product.images[0] ?? { ...productImageFallback, alt: product.title };
}
