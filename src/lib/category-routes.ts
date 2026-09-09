import type { CatalogCategorySlug } from "@/data/migrated-products";

export function getCategoryHref(slug: CatalogCategorySlug) {
  return slug === "website-links" ? "/category/website-link-stands" : `/category/${slug}`;
}
