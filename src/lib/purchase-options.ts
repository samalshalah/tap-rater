import type { MigratedProduct } from "@/data/migrated-products";
import { hostedMultiLinkServiceAddon } from "@/lib/service-addons";

export type PurchaseOptionId = "standard_direct" | "branded_qr_direct" | "hosted_multilink";

export type PurchaseOption = {
  id: PurchaseOptionId;
  label: string;
  priceCents: number;
  monthlyPriceCents?: number;
  summary: string;
  requiresDestinationUrl: boolean;
  hasQr: boolean;
  requiresBusinessName: boolean;
  requiresLogo: boolean;
  requiresDesignStep: boolean;
  requiresCustomText: boolean;
  requiresManualCollection: boolean;
  requiresFinalProof: boolean;
  requiresSubscription: boolean;
  accountRequired: boolean;
};

export const standardDirectOption: PurchaseOption = {
  id: "standard_direct",
  label: "Standard Direct Stand",
  priceCents: 3900,
  summary: "Standard is NFC-only, with no printed QR. NFC taps open one destination link.",
  requiresDestinationUrl: true,
  hasQr: false,
  requiresBusinessName: false,
  requiresLogo: false,
  requiresDesignStep: false,
  requiresCustomText: false,
  requiresManualCollection: false,
  requiresFinalProof: false,
  requiresSubscription: false,
  accountRequired: false
};

export const brandedQrDirectOption: PurchaseOption = {
  id: "branded_qr_direct",
  label: "Branded + QR Direct Stand",
  priceCents: 4900,
  summary: "Add your logo, business name, and a QR code generated from your destination. Approve the artwork preview before payment. Final print artwork is generated after payment.",
  requiresDestinationUrl: true,
  hasQr: true,
  requiresBusinessName: true,
  requiresLogo: true,
  requiresDesignStep: true,
  requiresCustomText: false,
  requiresManualCollection: false,
  requiresFinalProof: true,
  requiresSubscription: false,
  accountRequired: false
};

export const hostedMultiLinkOption: PurchaseOption = {
  id: "hosted_multilink",
  label: "Multi-Link",
  priceCents: 0,
  monthlyPriceCents: hostedMultiLinkServiceAddon.monthlyPriceCents,
  summary: "Editable Tap Rater page with up to 10 links.",
  requiresDestinationUrl: false,
  hasQr: true,
  requiresBusinessName: true,
  requiresLogo: true,
  requiresDesignStep: true,
  requiresCustomText: false,
  requiresManualCollection: true,
  requiresFinalProof: true,
  requiresSubscription: true,
  accountRequired: true
};

type ProductForPurchaseOptions = Pick<
  MigratedProduct,
  | "slug"
  | "categorySlug"
  | "allowsCustomDesign"
  | "isSpecialSolution"
  | "productKind"
  | "purchaseOptions"
  | "requiresLandingPage"
  | "requiresSubscription"
> & {
  assetSet?: Pick<NonNullable<MigratedProduct["assetSet"]>, "brandedFrontTemplateUrl" | "centerAssetUrl">;
};

export function hasBrandedDirectProductionTemplate(product: ProductForPurchaseOptions): boolean {
  return Boolean(product.assetSet?.brandedFrontTemplateUrl?.trim());
}

export function isHostedPurchaseOptionEnabled(): boolean {
  return process.env.TAP_RATER_ENABLE_HOSTED_PURCHASING !== "false";
}

export function isPurchaseOptionSellableForProduct(product: ProductForPurchaseOptions, optionId: PurchaseOptionId): boolean {
  const isHostedProduct =
    product.productKind === "hosted_multilink" ||
    product.isSpecialSolution ||
    product.requiresLandingPage ||
    product.requiresSubscription;

  if (optionId === "hosted_multilink") {
    return false;
  }

  if (isHostedProduct) {
    return false;
  }

  if (optionId === "branded_qr_direct") {
    return hasBrandedDirectProductionTemplate(product);
  }

  return optionId === "standard_direct";
}

export function getProductPurchaseOptions(
  product: ProductForPurchaseOptions
): PurchaseOption[] {
  if (Array.isArray(product.purchaseOptions)) {
    return product.purchaseOptions
      .filter((option) => option.optionCode !== "hosted_multilink" && option.isActive && isPurchaseOptionSellableForProduct(product, option.optionCode))
      .sort((first, second) => first.sortOrder - second.sortOrder)
      .map((option) => {
        return {
          id: option.optionCode,
          label: option.title,
          priceCents: option.priceCents,
          monthlyPriceCents: option.monthlyPriceCents,
          summary: correctKnownPurchaseCopy(option.description),
          requiresDestinationUrl: option.requiresDestinationUrl,
          hasQr: option.optionCode === "standard_direct" ? false : option.hasQr,
          requiresBusinessName: option.requiresBusinessName,
          requiresLogo: option.requiresLogo,
          requiresDesignStep: option.requiresDesignStep,
          requiresCustomText: false,
          requiresManualCollection: false,
          requiresFinalProof: option.requiresFrontProof,
          requiresSubscription: option.requiresSubscription,
          accountRequired: option.accountRequired
        };
      });
  }

  if (product.productKind === "hosted_multilink" || product.isSpecialSolution || product.requiresLandingPage || product.requiresSubscription) {
    return [];
  }

  return hasBrandedDirectProductionTemplate(product) ? [standardDirectOption, brandedQrDirectOption] : [standardDirectOption];
}

export function getPurchaseOption(optionId: string): PurchaseOption | undefined {
  return [standardDirectOption, brandedQrDirectOption, hostedMultiLinkOption].find((option) => option.id === optionId);
}

// Match only published claims we own; leave other merchant-authored copy intact.
const knownPurchaseClaims = new Map<string, string>([
  ["Countertop NFC and QR stand that opens your Yelp review destination.", "Countertop NFC stand that opens your Yelp review or business profile destination. Standard is NFC-only; Branded adds a printed QR code."],
  ["Ready-made stand with NFC tap connected directly to one destination link.", standardDirectOption.summary],
  ["Ready-made Google Review Stand with QR and NFC programmed to the Google review link you provide.", "Ready-made Google Review Stand with NFC programmed to your Google review link. Standard is NFC-only, with no printed QR."],
  ["Countertop Google Review Stand with NFC and QR. Customers tap or scan to open your Google review link directly-no app or subscription required.", "Countertop Google Review Stand with NFC. Standard is NFC-only, with no printed QR. Branded adds a destination-generated QR, logo, and business name."],
  ["The Google Review Stand uses both NFC and a printed QR code, and both open the same Google review link you provide.", "Standard uses NFC only, with no printed QR. Branded adds a QR code generated from the same Google review link."],
  ["Choose Standard for the ready-made Tap Rater Google design, or Branded to add your logo and business name for Tap Rater artwork review after the order.", "Choose Standard for the ready-made Tap Rater Google design, or Branded to add your logo and business name. Approve the Branded artwork preview before payment. Final print artwork is generated after payment."],
  ["Add your logo, business name, and QR code before checkout. Tap Rater reviews artwork after the order.", brandedQrDirectOption.summary],
  ["Tap Rater reviews artwork before production.", "Approve the artwork preview before payment. Final print artwork is generated after payment."],
  ["Branded direct stand with NFC, QR, business name, logo collection, and artwork review.", brandedQrDirectOption.summary],
  ["Branded direct stand with NFC, printed QR, business name, logo collection, and front proof.", brandedQrDirectOption.summary]
]);

export function correctKnownPurchaseCopy(value: string): string {
  let corrected = value;
  for (const [claim, replacement] of knownPurchaseClaims) {
    corrected = corrected.replaceAll(claim, replacement);
  }
  return corrected;
}

export function getLowestPurchasePriceCents(
  product: Pick<
    MigratedProduct,
    | "slug"
    | "categorySlug"
    | "allowsCustomDesign"
    | "basePriceCents"
    | "isSpecialSolution"
    | "productKind"
    | "purchaseOptions"
    | "requiresLandingPage"
    | "requiresSubscription"
  > & {
    assetSet?: Pick<NonNullable<MigratedProduct["assetSet"]>, "brandedFrontTemplateUrl" | "centerAssetUrl">;
  }
) {
  const optionPrices = getProductPurchaseOptions(product).map((option) => option.priceCents);
  return optionPrices.length > 0 ? Math.min(...optionPrices) : product.basePriceCents;
}
