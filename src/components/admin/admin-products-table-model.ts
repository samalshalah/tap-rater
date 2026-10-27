import type { MigratedProduct, ProductKind } from "@/data/migrated-products";
import { getBrandedProductionTemplateReadiness, type BrandedTemplateReadiness } from "@/lib/admin-product-readiness";
import type { BusinessUse } from "@/lib/catalog-architecture";
import { getDefaultOptionsForProductKind, getProductAssetReadiness, inferProductKind } from "@/lib/catalog-architecture";
import { formatPrice } from "@/lib/products";
export function getMediaWarnings(product: MigratedProduct) {
  const warnings = new Set<string>();
  const mainImage = product.images[0]?.src ?? "";
  const standardImage = product.assetSet?.standardAngledImageUrl ?? mainImage;
  const brandedImage = product.assetSet?.brandedAngledImageUrl ?? "";
  const brandedTemplate = product.assetSet?.brandedFrontTemplateUrl ?? "";
  const imageText = product.images.map((image) => `${image.src} ${image.alt}`).join(" ").toLowerCase();

  if (mainImage.includes("no-photo-available")) {
    warnings.add("placeholder main image");
  }

  if (mainImage.includes("/draft-product/")) {
    warnings.add("main image still uses draft media path");
  }

  if (brandedImage && standardImage && brandedImage === standardImage) {
    warnings.add("branded angled image matches standard image");
  }

  if (brandedTemplate.includes("/api/media/product/products/") && !brandedTemplate.includes(`/products/${product.slug}/`)) {
    warnings.add("front template reused from another product");
  }

  if (imageText.includes("temporary")) {
    warnings.add("temporary media label");
  }

  return Array.from(warnings);
}

export function getProductKind(product: MigratedProduct): ProductKind {
  return product.productKind ?? inferProductKind(product);
}

export function getProductStatus(product: MigratedProduct) {
  return product.status ?? (product.isActive ? "active" : "draft");
}

export function findTitle(items: { slug: string; title: string }[], slug?: string) {
  return slug ? items.find((item) => item.slug === slug)?.title ?? slug : undefined;
}

export function formatBusinessUses(product: MigratedProduct, businessUses: BusinessUse[]) {
  const slugs = product.businessUseSlugs ?? [];
  if (slugs.length === 0) return "-";

  const labels = slugs.map((slug) => findTitle(businessUses, slug)).filter(Boolean);
  return labels.length > 2 ? `${labels.slice(0, 2).join(", ")} +${labels.length - 2}` : labels.join(", ");
}

export function formatPriceRange(options: ReturnType<typeof getDefaultOptionsForProductKind>, product: MigratedProduct) {
  if (options.length === 0) {
    return formatPrice(product.salePriceCents ?? product.basePriceCents);
  }

  if (options.length === 1) {
    const option = options[0];
    return option.monthlyPriceCents ? `${formatPrice(option.priceCents)} + ${formatPrice(option.monthlyPriceCents)}/mo` : formatPrice(option.priceCents);
  }

  const prices = options.map((option) => option.priceCents).sort((first, second) => first - second);
  return `${formatPrice(prices[0])}-${formatPrice(prices[prices.length - 1])}`;
}

export function isProductListReady(status: string, brandedReadiness: BrandedTemplateReadiness, warnings: string[]) {
  return status === "ready" && brandedReadiness.status !== "missing" && warnings.length === 0;
}

export function buildProductTableMetadata(product: MigratedProduct) {
  const productKind = getProductKind(product);
  const allOptions = getDefaultOptionsForProductKind(productKind);
  const options = allOptions.filter(option => option.isActive);
  const readiness = getProductAssetReadiness(product, options);
  const brandedReadiness = getBrandedProductionTemplateReadiness(product, options);
  return {
    productKind, options, readiness, brandedReadiness,
    productReady: isProductListReady(readiness.status, brandedReadiness, getMediaWarnings(product)),
    productStatus: getProductStatus(product),
    assetStatus: getProductAssetReadiness(product, allOptions).status,
    searchText: [product.title, product.slug, product.sku, product.primaryPlatformSlug, product.destinationType].filter(Boolean).join(" ").toLowerCase()
  };
}
