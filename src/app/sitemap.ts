import type { MetadataRoute } from "next";
import { catalogCategories } from "@/data/migrated-products";
import { getPublicBusinessUses } from "@/lib/admin-business-uses";
import { getPublicSiteUrl } from "@/lib/public-site-url";
import { getStorefrontProducts } from "@/lib/product-repository";
import { categoryToStandTypeSlug, getCategoryHref } from "@/lib/category-routes";
import { getPublicStandTypes } from "@/lib/admin-stand-types";
import { getProductVisual } from "@/lib/storefront-visuals";
import { productMatchesCategory } from "@/lib/category-products";
import { getCanonicalProductSlug } from "@/lib/product-slug-aliases";
import { retiredProductRedirects } from "@/lib/storefront-redirects";
import { googleReviewStandGuides } from "@/lib/google-review-stand-guides";

const siteUrl = getPublicSiteUrl();
const staticRoutes = [
  "",
  "/shop",
  "/solutions",
  "/how-it-works",
  "/review-links-generator",
  "/nfc-vs-qr-google-review-stand",
  ...googleReviewStandGuides.map(({ href }) => href),
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
  const canonicalProducts = products.filter(({ slug }) => slug !== "multi-link-stand"
    && !Object.hasOwn(retiredProductRedirects, slug)
    && getCanonicalProductSlug(slug) === slug);
  const productRoutes = canonicalProducts.map((product) => `/product/${product.slug}`);
  const categoryRoutes = catalogCategories
    .filter((category) => category.slug !== "custom-stands"
      && standTypes.some((type) => type.slug === categoryToStandTypeSlug(category.slug))
      && products.some((product) => productMatchesCategory(product, category.slug)))
    .map((category) => getCategoryHref(category.slug));
  const businessUseRoutes = businessUses.map((businessUse) => `/solutions/${businessUse.slug}`);
  const paths = Array.from(new Set([...staticRoutes, ...categoryRoutes, ...businessUseRoutes, ...productRoutes]));

  const productImages = new Map(canonicalProducts.map((product) => [
    `/product/${product.slug}`,
    new URL(getProductVisual(product).src, siteUrl).toString()
  ]));
  return paths.map((path) => ({
    ...route(path),
    ...(productImages.has(path) ? { images: [productImages.get(path)!] } : {})
  }));
}
