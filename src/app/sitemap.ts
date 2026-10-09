import type { MetadataRoute } from "next";
import { catalogCategories } from "@/data/migrated-products";
import { getPublicBusinessUses } from "@/lib/admin-business-uses";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import { getStorefrontProducts } from "@/lib/product-repository";
import { categoryToStandTypeSlug, getCategoryHref } from "@/lib/category-routes";
import { getPublicStandTypes } from "@/lib/admin-stand-types";
import { productMatchesCategory } from "@/lib/category-products";

const siteUrl = getPublicSiteUrl();
const staticRoutes = [
  "",
  "/shop",
  "/solutions",
  "/how-it-works",
  "/review-links-generator",
  "/custom-stands",
  "/multi-link",
  "/pricing",
  "/stand-bundles",
  "/support",
  "/faqs",
  "/contact-us",
  "/shipping",
  "/terms",
  "/privacy-policy",
  "/refund-policy"
];

function route(path: string): MetadataRoute.Sitemap[number] {
  return {
    url: `${siteUrl}${path}`
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, businessUses, standTypes] = await Promise.all([getStorefrontProducts(), getPublicBusinessUses(), getPublicStandTypes()]);
  const productRoutes = products.map((product) => `/product/${product.slug}`);
  const categoryRoutes = catalogCategories
    .filter((category) => category.slug !== "custom-stands"
      && standTypes.some((type) => type.slug === categoryToStandTypeSlug(category.slug))
      && products.some((product) => productMatchesCategory(product, category.slug)))
    .map((category) => getCategoryHref(category.slug));
  const businessUseRoutes = businessUses.map((businessUse) => `/solutions/${businessUse.slug}`);
  const paths = Array.from(new Set([...staticRoutes, ...categoryRoutes, ...businessUseRoutes, ...productRoutes]));

  return paths.map(route);
}
