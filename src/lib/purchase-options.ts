import type { MigratedProduct } from "@/data/migrated-products";

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
  summary: "Ready-made stand with QR and NFC connected directly to one destination link.",
  requiresDestinationUrl: true,
  hasQr: true,
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
  summary: "Add your logo, business name, and QR code before checkout with a front proof preview.",
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
  label: "Hosted Multi-Link Stand",
  priceCents: 4900,
  monthlyPriceCents: 990,
  summary: "Branded stand connected to a hosted Tap Rater page with up to 10 managed links.",
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
  return true;
}

export function isPurchaseOptionSellableForProduct(product: ProductForPurchaseOptions, optionId: PurchaseOptionId): boolean {
  const isHostedProduct =
    product.productKind === "hosted_multilink" ||
    product.isSpecialSolution ||
    product.requiresLandingPage ||
    product.requiresSubscription;

  if (optionId === "hosted_multilink") {
    return isHostedPurchaseOptionEnabled();
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
      .filter((option) => option.isActive && isPurchaseOptionSellableForProduct(product, option.optionCode))
      .sort((first, second) => first.sortOrder - second.sortOrder)
      .map((option) => {
        const isStandardDirect = option.optionCode === "standard_direct";

        return {
          id: option.optionCode,
          label: option.title,
          priceCents: option.priceCents,
          monthlyPriceCents: option.monthlyPriceCents,
          summary: isStandardDirect ? standardDirectOption.summary : option.description,
          requiresDestinationUrl: option.requiresDestinationUrl,
          hasQr: isStandardDirect ? true : option.hasQr,
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
    return isHostedPurchaseOptionEnabled() ? [hostedMultiLinkOption] : [];
  }

  return hasBrandedDirectProductionTemplate(product) ? [standardDirectOption, brandedQrDirectOption] : [standardDirectOption];
}

export function getPurchaseOption(optionId: string): PurchaseOption | undefined {
  return [standardDirectOption, brandedQrDirectOption, hostedMultiLinkOption].find((option) => option.id === optionId);
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
