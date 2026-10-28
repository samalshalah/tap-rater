

import type { MigratedProduct,ProductColorOption,ProductKind,ProductSizeOption,SupportedDestination } from "@/data/migrated-products";
import type {
PlatformDestination,
ProductOption,
ProductOptionCode
} from "@/lib/catalog-architecture";
import { getDefaultOptionsForProductKind } from "@/lib/catalog-architecture";
import { formatPrice } from "@/lib/products";

import type { AssetSetState,MediaItemState,OperationalProductKind } from "./product-editor-types";
export function createSizeOption(index: number): ProductSizeOption {
  return {
    code: `size-${index + 1}`,
    label: `Size ${index + 1}`,
    frontWidthMm: 1,
    frontHeightMm: 1,
    frontWidthIn: 0.01,
    frontHeightIn: 0.01,
    baseDepthMm: 1,
    baseDepthIn: 0.01,
    skuSuffix: `S${index + 1}`,
    priceAdjustmentCents: null,
    isDefault: index === 0,
    isActive: false
  };
}

export function createColorOption(index: number): ProductColorOption {
  return {
    code: `color-${index + 1}`,
    label: `Color ${index + 1}`,
    skuSuffix: `C${index + 1}`,
    priceAdjustmentCents: 0,
    isDefault: index === 0,
    isActive: false
  };
}

export function buildInitialOptions(productKind: ProductKind, productOptions: ProductOption[], optionTemplates: ProductOption[], mode: "create" | "edit") {
  const templateMap = new Map([...getDefaultOptionsForProductKind(productKind), ...optionTemplates].map((option) => [option.optionCode, option]));
  const savedOptionMap = new Map(productOptions.map((option) => [option.optionCode, option]));
  const codes: ProductOptionCode[] = ["standard_direct", "branded_qr_direct"];

  return codes.map((code) => ({
    ...(templateMap.get(code) ?? getDefaultOptionsForProductKind("normal_direct").find((option) => option.optionCode === code)!),
    ...(mode === "create" && code === "branded_qr_direct" ? { isActive: false } : {}),
    ...(savedOptionMap.get(code) ?? {}),
    ...(code === "standard_direct" ? { isActive: false } : {})
  }));
}

export function normalizeOperationalProductKind(productKind: ProductKind): OperationalProductKind {
  return productKind === "hosted_multilink" ? "normal_direct" : productKind;
}

export function getOptionMediaRequirements(optionCode: ProductOptionCode, assetSet: AssetSetState) {
  if (optionCode === "branded_qr_direct") {
    return [
      {
        label: "Branded + QR angled image",
        description: "Optional storefront preview for the branded stand option.",
        assetKey: "brandedAngledImageUrl" as const,
        role: "branded_angled" as const,
        value: assetSet.brandedAngledImageUrl,
        required: false
      },
      {
        label: "Branded front template",
        description: "Print template with logo, business-name, and QR zones.",
        assetKey: "brandedFrontTemplateUrl" as const,
        role: "branded_front_template" as const,
        value: assetSet.brandedFrontTemplateUrl,
        required: true
      }
    ];
  }

  return [
    {
      label: "Standard Direct angled image",
      description: "Ready-made NFC stand image for Standard Direct.",
      assetKey: "standardAngledImageUrl" as const,
      role: "standard_angled" as const,
      value: assetSet.standardAngledImageUrl,
      required: true
    },
    {
      label: "Standard front template",
      description: "Optional locked front reference for standard stands.",
      assetKey: "standardFrontTemplateUrl" as const,
      role: "standard_front" as const,
      value: assetSet.standardFrontTemplateUrl,
      required: false
    }
  ];
}

export function getOrganizationIssues({
  productKind,
  standTypeSlug,
  primaryPlatformSlug,
  destinationType,
  businessUseSlugs,
  isSpecialSolution
}: {
  productKind: ProductKind;
  standTypeSlug: string;
  primaryPlatformSlug: string;
  destinationType: string;
  businessUseSlugs: string[];
  isSpecialSolution: boolean;
}) {
  const issues: string[] = [];

  if (!standTypeSlug) issues.push("Missing stand type");
  if (!destinationType) issues.push("Missing destination type");
  if (!primaryPlatformSlug) issues.push("Missing platform / destination");
  if (!isSpecialSolution && businessUseSlugs.length === 0) {
    issues.push("Missing business use");
  }

  return issues;
}

export function cleanAssetSet(assetSet: AssetSetState, mainImageSrc?: string) {
  return {
    standardAngledImageUrl: readOptionalString(assetSet.standardAngledImageUrl) ?? readOptionalString(mainImageSrc),
    brandedAngledImageUrl: readOptionalString(assetSet.brandedAngledImageUrl),
    multiLinkAngledImageUrl: undefined,
    standardFrontTemplateUrl: readOptionalString(assetSet.standardFrontTemplateUrl),
    brandedFrontTemplateUrl: readOptionalString(assetSet.brandedFrontTemplateUrl),
    multiLinkFrontTemplateUrl: undefined,
    centerAssetUrl: undefined,
    landingPagePreviewConfig: undefined
  };
}

export function collectImagesFromMedia(
  mainImage: MediaItemState,
  galleryImages: MediaItemState[],
  assetSet: AssetSetState,
  title: string
): MigratedProduct["images"] {
  const sources = [
    mainImage.src,
    ...galleryImages.map((image) => image.src),
    assetSet.standardAngledImageUrl,
    assetSet.brandedAngledImageUrl,
    assetSet.standardFrontTemplateUrl,
    assetSet.brandedFrontTemplateUrl
  ];
  const seen = new Set<string>();

  return sources
    .map(readOptionalString)
    .filter((source): source is string => {
      if (!source || seen.has(source)) return false;
      seen.add(source);
      return true;
    })
    .map((src) => ({ src, alt: title }));
}

export function getAdminMediaWarnings(slug: string, mainImage: MediaItemState, galleryImages: MediaItemState[], assetSet: AssetSetState) {
  const warnings = new Set<string>();
  const standardImage = readOptionalString(assetSet.standardAngledImageUrl) ?? readOptionalString(mainImage.src) ?? "";
  const brandedImage = readOptionalString(assetSet.brandedAngledImageUrl) ?? "";
  const brandedTemplate = readOptionalString(assetSet.brandedFrontTemplateUrl) ?? "";
  const mediaText = [mainImage, ...galleryImages]
    .map((image) => `${image.src} ${image.alt}`)
    .join(" ")
    .toLowerCase();

  if (mainImage.src.includes("no-photo-available")) {
    warnings.add("Placeholder main image is still in use.");
  }

  if (mainImage.src.includes("/draft-product/")) {
    warnings.add("Main image still uses a draft product media path.");
  }

  if (brandedImage && standardImage && brandedImage === standardImage) {
    warnings.add("Branded angled image currently matches the Standard Direct image.");
  }

  if (brandedTemplate.includes("/products/") && !brandedTemplate.includes(`/products/${slug}/`)) {
    warnings.add("Branded front template appears to be reused from another product.");
  }

  if (mediaText.includes("temporary")) {
    warnings.add("One or more media items are labeled temporary.");
  }

  return Array.from(warnings);
}

export function categorySlugForStandType(standTypeSlug: string): MigratedProduct["categorySlug"] {
  const map: Record<string, MigratedProduct["categorySlug"]> = {
    "review-stands": "reviews",
    "social-media-stands": "social-media",
    "appointment-reservation-stands": "appointments",
    "feedback-survey-stands": "feedback",
    "menu-info-stands": "menu",
    "website-link-stands": "website-links",
    "payment-tip-donation-stands": "website-links",
    "loyalty-rewards-stands": "website-links",
    "custom-stands": "custom-stands"
  };

  return map[standTypeSlug] ?? "website-links";
}

export function selectedPlatformDestinationType(platforms: PlatformDestination[], platformSlug: string) {
  return platforms.find((platform) => platform.slug === platformSlug)?.destinationType ?? "custom";
}

export function getSupportedDestinations(platformSlug: string): SupportedDestination[] {
  const supported = new Set<SupportedDestination>([
    "google",
    "facebook",
    "yelp",
    "tripadvisor",
    "trustpilot",
    "bbb",
    "nextdoor",
    "dealerrater",
    "autotrader",
    "carfax",
    "edmunds",
    "cars",
    "cargurus",
    "repairpal",
    "surecritic",
    "homeadvisor",
    "thumbtack",
    "houzz",
    "porch",
    "instagram",
    "tiktok",
    "linkedin",
    "x",
    "youtube",
    "snapchat",
    "pinterest",
    "airbnb",
    "agoda",
    "vrbo",
    "hotels",
    "healthgrades",
    "vitals",
    "ratemds",
    "caredash",
    "opencare",
    "vagaro",
    "booksy",
    "fresha",
    "zocdoc",
    "calendly",
    "acuity",
    "square-appointments",
    "custom-booking-url",
    "booking",
    "toast",
    "doordash",
    "ubereats",
    "angi",
    "grubhub",
    "opentable",
    "resy",
    "custom-menu-url",
    "website",
    "menu",
    "wifi",
    "feedback",
    "referral",
    "payment-url",
    "loyalty-url",
    "custom-url",
    "custom"
  ]);

  return supported.has(platformSlug as SupportedDestination) ? [platformSlug as SupportedDestination] : ["custom"];
}

export function formatOptionPricing(options: ProductOption[]) {
  if (options.length === 0) return "";
  if (options.length === 1) {
    const option = options[0];
    return option.monthlyPriceCents ? `${formatPrice(option.priceCents)} + ${formatPrice(option.monthlyPriceCents)}/mo` : formatPrice(option.priceCents);
  }

  const prices = options.map((option) => option.priceCents).sort((first, second) => first - second);
  return `${formatPrice(prices[0])}-${formatPrice(prices[prices.length - 1])}`;
}

export function generateProductSku(title: string) {
  const normalized = title.toLowerCase();
  if (normalized.includes("google") && normalized.includes("review") && normalized.includes("stand")) {
    return "TR-GOOGLE-REV-ST";
  }

  const cleaned = normalized
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toUpperCase();
  return formatSku(`TR-${cleaned || "PRODUCT"}`);
}

export function getOptionDisplayMeta(option: ProductOption) {
  const map: Record<ProductOptionCode, { badge: string; summary: string }> = {
    standard_direct: {
      badge: "STD / NFC",
      summary: "Standard Direct uses the ready-made angled stand image with NFC pointed to one direct URL."
    },
    branded_qr_direct: {
      badge: "BQR / NFC + QR",
      summary: "Branded + QR uses its own angled image plus a front template with logo, business-name, and QR zones."
    },
    hosted_multilink: {
      badge: "HML / hosted page",
      summary: "Hosted Multi-Link uses branded stand media, a hosted Tap Rater page, and monthly service."
    }
  };

  return map[option.optionCode];
}

export function optionSkuSuffix(optionCode: ProductOptionCode) {
  const map: Record<ProductOptionCode, string> = {
    standard_direct: "STD",
    branded_qr_direct: "BRD",
    hosted_multilink: "HML"
  };

  return map[optionCode];
}

export function formatSku(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
}

export function parseMultiline(value: string) {
  return Array.from(new Set(value.split(/\r?\n|\|/).map((item) => item.trim()).filter(Boolean)));
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function readRequiredText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export function readOptionalString(value?: string) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
