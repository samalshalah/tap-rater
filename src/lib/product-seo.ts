import type { MigratedProduct } from "@/data/migrated-products";
import { lockedBusinessUses, lockedPlatforms, lockedStandTypes } from "@/lib/catalog-architecture";
import { formatPrice, getCategoryBySlug, getProductPriceCents } from "@/lib/products";
import { getProductPurchaseOptions } from "@/lib/purchase-options";

export type ProductSeo = {
  title: string;
  description: string;
  generatedTitle: string;
  generatedDescription: string;
  isTitleCustom: boolean;
  isDescriptionCustom: boolean;
};

const MAX_TITLE_LENGTH = 64;
const MAX_DESCRIPTION_LENGTH = 158;

export function generateProductSeo(product: MigratedProduct): Pick<ProductSeo, "generatedTitle" | "generatedDescription"> {
  const title = cleanProductTitle(product.title);
  const standType = getStandTypeTitle(product);
  const platform = getPlatformTitle(product);
  const useCase = getPrimaryBusinessUseTitle(product);
  const price = formatPrice(getProductPriceCents(product)).replace(".00", "");
  const isHosted = product.productKind === "hosted_multilink" || product.isSpecialSolution || product.requiresSubscription || product.requiresLandingPage;

  if (isHosted) {
    return {
      generatedTitle: clampSeoText(`${title} | Branded QR Landing Page Stand`, MAX_TITLE_LENGTH),
      generatedDescription: clampSeoText(
        `Get a branded stand with QR and a hosted Tap Rater landing page for up to 10 links. Monthly hosting keeps links managed. Starts at ${price}.`,
        MAX_DESCRIPTION_LENGTH
      )
    };
  }

  const titleIntent = getTitleIntent(product, standType);
  const generatedTitle = clampSeoText(`${title} | NFC ${titleIntent} from ${price}`, MAX_TITLE_LENGTH);
  const generatedDescription = clampSeoText(
    buildDescription({ product, platform, useCase, price }),
    MAX_DESCRIPTION_LENGTH
  );

  return { generatedTitle, generatedDescription };
}

export function resolveProductSeo(product: MigratedProduct): ProductSeo {
  const generated = generateProductSeo(product);
  const customTitle = normalizeCustomSeo(product.seoTitle);
  const customDescription = normalizeCustomSeo(product.seoDescription);

  return {
    ...generated,
    title: customTitle ? clampSeoText(stripTapRaterSuffix(customTitle), MAX_TITLE_LENGTH) : generated.generatedTitle,
    description: customDescription ? clampSeoText(customDescription, MAX_DESCRIPTION_LENGTH) : generated.generatedDescription,
    isTitleCustom: Boolean(customTitle),
    isDescriptionCustom: Boolean(customDescription)
  };
}

function buildDescription({
  product,
  platform,
  useCase,
  price
}: {
  product: MigratedProduct;
  platform?: string;
  useCase?: string;
  price: string;
}) {
  const options = getProductPurchaseOptions(product);
  const supportsBranded = options.some((option) => option.id === "branded_qr_direct");
  const optionCopy = supportsBranded ? "Choose Standard Direct or Branded + QR for your business." : "Order a ready-made direct stand.";
  const actionCopy = getDescriptionAction({ product, platform, useCase });

  if ((product.destinationType ?? "").includes("booking")) {
    return `${actionCopy} Starts at ${price}.`;
  }

  return `${actionCopy} ${optionCopy} Starts at ${price}.`;
}

function getTitleIntent(product: MigratedProduct, standType: string) {
  const destinationType = product.destinationType ?? "";

  if (destinationType.includes("booking") || product.categorySlug === "appointments") return "Booking Stand";
  if (destinationType.includes("menu") || product.categorySlug === "menu") return "Menu Stand";
  if (destinationType.includes("social") || product.categorySlug === "social-media") return "Social Media Stand";
  if (destinationType.includes("payment")) return "Payment Stand";
  if (destinationType.includes("loyalty")) return "Loyalty Stand";
  if (destinationType.includes("website") || product.categorySlug === "website-links") return "Website Link Stand";
  if (destinationType.includes("feedback") || product.categorySlug === "feedback") return "Feedback Stand";
  if (destinationType.includes("review") || product.categorySlug === "reviews") return "Review Stand";

  return singularizeStandType(standType);
}

function getDescriptionAction({
  product,
  platform,
  useCase
}: {
  product: MigratedProduct;
  platform?: string;
  useCase?: string;
}) {
  const destinationType = product.destinationType ?? "";
  const platformCopy = platform && !isGenericPlatform(platform) ? platform : "";

  if (destinationType.includes("booking")) {
    return "Let customers book appointments with one tap. Works with booking links like Vagaro, Booksy, Fresha, Calendly, Zocdoc, or any booking URL.";
  }
  if (destinationType.includes("reservation")) return "Let customers reserve a table with one tap.";
  if (destinationType.includes("menu")) return "Let customers open your menu with one tap.";
  if (destinationType.includes("order")) return "Send customers to online ordering with one tap.";
  if (destinationType.includes("social")) return "Send customers to your social profiles with one tap.";
  if (destinationType.includes("payment")) return "Let customers open your payment or tip link with one tap.";
  if (destinationType.includes("loyalty")) return "Let customers join your loyalty or rewards program with one tap.";
  if (destinationType.includes("website")) return "Send customers to your website with one tap.";
  if (destinationType.includes("feedback")) return "Collect customer feedback with one tap.";
  if (destinationType.includes("review")) {
    return platformCopy
      ? `Get more ${platformCopy} reviews with a Tap Rater NFC review stand.`
      : `Get more reviews with a Tap Rater NFC review stand${useCase ? ` for ${formatUseCase(useCase)} businesses` : ""}.`;
  }

  return "Connect customers to your most important link with one tap.";
}

function getStandTypeTitle(product: MigratedProduct) {
  return (
    lockedStandTypes.find((standType) => standType.slug === product.standTypeSlug)?.title ??
    getCategoryBySlug(product.categorySlug)?.title ??
    "NFC Stands"
  );
}

function getPlatformTitle(product: MigratedProduct) {
  const directPlatform = lockedPlatforms.find((platform) => platform.slug === product.primaryPlatformSlug)?.title;
  if (directPlatform) return directPlatform;

  const supportedPlatform = (product.supportedDestinations ?? [])
    .map((destination) => lockedPlatforms.find((platform) => platform.slug === destination)?.title)
    .find(Boolean);

  return supportedPlatform;
}

function getPrimaryBusinessUseTitle(product: MigratedProduct) {
  const slug = product.businessUseSlugs?.[0];
  return slug ? lockedBusinessUses.find((use) => use.slug === slug)?.title : undefined;
}

function cleanProductTitle(title: string) {
  return title.replace(/\s+/g, " ").trim() || "Tap Rater Stand";
}

function normalizeCustomSeo(value?: string) {
  return value?.replace(/\s+/g, " ").trim();
}

function stripTapRaterSuffix(value: string) {
  return value.replace(/\s*\|\s*Tap Rater\s*$/i, "").trim();
}

function singularizeStandType(value: string) {
  return value.replace(/\bStands\b/i, "Stand").replace(/\bPlates\b/i, "Plate");
}

function isGenericPlatform(value: string) {
  return /custom|website url|payment url|loyalty url/i.test(value);
}

function formatUseCase(value: string) {
  return value.toLowerCase().replace(/\s*\/\s*/g, " and ");
}

function clampSeoText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;

  const targetLength = Math.max(1, maxLength - 3);
  const clipped = normalized.slice(0, targetLength + 1);
  const lastSpace = clipped.lastIndexOf(" ");
  const trimmed = (lastSpace > targetLength * 0.7 ? clipped.slice(0, lastSpace) : normalized.slice(0, targetLength)).trim();

  return `${trimmed.replace(/[.,;:!?-]+$/g, "")}...`;
}
