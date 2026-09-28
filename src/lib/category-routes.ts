import type { CatalogCategorySlug } from "@/data/migrated-products";

export function getCategoryHref(slug: CatalogCategorySlug) {
  if (slug === "custom-stands") return "/custom-stands";
  return slug === "website-links" ? "/category/website-link-stands" : `/category/${slug}`;
}

export function categoryToStandTypeSlug(slug: CatalogCategorySlug) {
  const map: Record<CatalogCategorySlug, string> = {
    reviews: "review-stands",
    "social-media": "social-media-stands",
    appointments: "appointment-reservation-stands",
    menu: "menu-info-stands",
    feedback: "feedback-survey-stands",
    "website-links": "website-link-stands",
    "custom-stands": "custom-stands"
  };
  return map[slug];
}
