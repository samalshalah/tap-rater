import type { MigratedProduct } from "@/data/migrated-products";
import { getProductPurchaseOptions } from "@/lib/purchase-options";

// Curated secondary uses do not change the product's primary admin category.
const secondaryCategoryProducts: Record<string, readonly string[]> = {
  appointments: ["connect-with-us-stand", "explore-our-services-stand"],
  feedback: ["rate-your-experience-stand"]
};

export function productMatchesCategory(product: MigratedProduct, categorySlug: string) {
  if (!product.isActive || product.status === "draft" || product.status === "archived" || product.stockStatus !== "instock") return false;
  if (categorySlug === "custom-stands") {
    return getProductPurchaseOptions(product).some((option) => option.id === "branded_qr_direct");
  }
  return product.categorySlug === categorySlug || Boolean(secondaryCategoryProducts[categorySlug]?.includes(product.slug));
}
