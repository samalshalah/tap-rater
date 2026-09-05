import type { MetadataRoute } from "next";
import { catalogCategories } from "@/data/migrated-products";
import { getPublicBusinessUses } from "@/lib/admin-business-uses";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import { getStorefrontProducts } from "@/lib/product-repository";

const siteUrl = getPublicSiteUrl();
const staticRoutes = [
  "",
  "/shop",
  "/solutions",
  "/how-it-works",
  "/custom-stands",
  "/pricing",
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
    url: `${siteUrl}${path}`,
    lastModified: new Date()
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, businessUses] = await Promise.all([getStorefrontProducts(), getPublicBusinessUses()]);
  const productRoutes = products.map((product) => `/product/${product.slug}`);
  const categoryRoutes = catalogCategories.map((category) => `/category/${category.slug}`);
  const businessUseRoutes = businessUses.map((businessUse) => `/solutions/${businessUse.slug}`);
  const paths = Array.from(new Set([...staticRoutes, ...categoryRoutes, ...businessUseRoutes, ...productRoutes]));

  return paths.map(route);
}
