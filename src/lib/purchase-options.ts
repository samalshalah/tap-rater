import type { MigratedProduct } from "@/data/migrated-products";

export type PurchaseOptionId = "standard_direct" | "branded_qr_direct" | "custom_direct";

export type PurchaseOption = {
  id: PurchaseOptionId;
  label: string;
  priceCents: number;
  summary: string;
  requiresBusinessName: boolean;
  requiresLogo: boolean;
  requiresCustomText: boolean;
  requiresManualCollection: boolean;
  requiresFinalProof: boolean;
};

export const standardDirectOption: PurchaseOption = {
  id: "standard_direct",
  label: "Standard Direct Stand",
  priceCents: 3900,
  summary: "Ready-made stand connected to one direct NFC destination link.",
  requiresBusinessName: false,
  requiresLogo: false,
  requiresCustomText: false,
  requiresManualCollection: false,
  requiresFinalProof: false
};

export const brandedQrDirectOption: PurchaseOption = {
  id: "branded_qr_direct",
  label: "Branded + QR Direct Stand",
  priceCents: 4900,
  summary: "Add business name and QR code. Logo is collected after checkout before printing.",
  requiresBusinessName: true,
  requiresLogo: true,
  requiresCustomText: false,
  requiresManualCollection: true,
  requiresFinalProof: true
};

export const customDirectOption: PurchaseOption = {
  id: "custom_direct",
  label: "Custom Direct Stand",
  priceCents: 4900,
  summary: "Custom headline or center content. Logo/design details are collected after checkout.",
  requiresBusinessName: true,
  requiresLogo: true,
  requiresCustomText: true,
  requiresManualCollection: true,
  requiresFinalProof: true
};

export function getProductPurchaseOptions(product: Pick<MigratedProduct, "slug" | "categorySlug" | "allowsCustomDesign">): PurchaseOption[] {
  if (product.slug === "custom-direct-stand" || product.categorySlug === "custom-stands" || product.allowsCustomDesign) {
    return [customDirectOption];
  }

  return [standardDirectOption, brandedQrDirectOption];
}

export function getPurchaseOption(optionId: string): PurchaseOption | undefined {
  return [standardDirectOption, brandedQrDirectOption, customDirectOption].find((option) => option.id === optionId);
}

export function getLowestPurchasePriceCents(product: Pick<MigratedProduct, "slug" | "categorySlug" | "allowsCustomDesign">) {
  return Math.min(...getProductPurchaseOptions(product).map((option) => option.priceCents));
}
