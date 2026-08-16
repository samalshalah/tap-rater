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
  summary: "Ready-made stand connected to one direct NFC destination link. No printed QR code.",
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
  summary: "Add business name and QR code. Logo is collected after checkout before printing.",
  requiresDestinationUrl: true,
  hasQr: true,
  requiresBusinessName: true,
  requiresLogo: true,
  requiresDesignStep: true,
  requiresCustomText: false,
  requiresManualCollection: true,
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

export function getProductPurchaseOptions(
  product: Pick<MigratedProduct, "slug" | "categorySlug" | "allowsCustomDesign" | "isSpecialSolution" | "productKind" | "requiresLandingPage" | "requiresSubscription">
): PurchaseOption[] {
  if (product.productKind === "hosted_multilink" || product.isSpecialSolution || product.requiresLandingPage || product.requiresSubscription) {
    return [hostedMultiLinkOption];
  }

  return [standardDirectOption, brandedQrDirectOption];
}

export function getPurchaseOption(optionId: string): PurchaseOption | undefined {
  return [standardDirectOption, brandedQrDirectOption, hostedMultiLinkOption].find((option) => option.id === optionId);
}

export function getLowestPurchasePriceCents(
  product: Pick<MigratedProduct, "slug" | "categorySlug" | "allowsCustomDesign" | "isSpecialSolution" | "productKind" | "requiresLandingPage" | "requiresSubscription">
) {
  return Math.min(...getProductPurchaseOptions(product).map((option) => option.priceCents));
}
