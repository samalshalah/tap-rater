import type { MigratedProduct } from "@/data/migrated-products";
import type { CartItem } from "@/lib/cart";
import type { PurchaseOption, PurchaseOptionId } from "@/lib/purchase-options";

export type DestinationMode = "DIRECT" | "HOSTED";
export type CustomizationLevel = "STANDARD" | "BRANDED";

export type CanonicalProductModel = {
  destinationMode: DestinationMode;
  customizationLevel: CustomizationLevel;
};

export type ProductVariantSelection = {
  purchaseOptionId: PurchaseOptionId;
  sizeCode?: string;
  colorCode?: string;
};

const controlledProductSkuBases: Record<string, string> = {
  "google-review-stand": "TR-GOOGLE-REV-ST"
};

const purchaseOptionSkuCodes: Record<PurchaseOptionId, string> = {
  standard_direct: "STD",
  branded_qr_direct: "BRD",
  hosted_multilink: "HML"
};

export type ProductDestinationTargets =
  | {
      ok: true;
      destinationMode: "DIRECT";
      qrDestinationUrl: string;
      nfcDestinationUrl: string;
    }
  | {
      ok: true;
      destinationMode: "HOSTED";
      qrDestinationUrl: string;
      nfcDestinationUrl: string;
    }
  | {
      ok: false;
      destinationMode: DestinationMode;
      reason: "missing_direct_destination" | "missing_hosted_code" | "invalid_url";
    };

export function getProductDestinationMode(
  product: Pick<
    MigratedProduct,
    "productType" | "serviceMode" | "productKind" | "requiresAccount" | "requiresSubscription" | "requiresLandingPage"
  >
): DestinationMode {
  if (
    product.productType === "platform_landing_page" ||
    product.serviceMode === "hosted_landing_page" ||
    product.serviceMode === "multi_location_platform" ||
    product.productKind === "hosted_multilink" ||
    product.requiresAccount ||
    product.requiresSubscription ||
    product.requiresLandingPage
  ) {
    return "HOSTED";
  }

  return "DIRECT";
}

export function getProductCustomizationLevel(
  product: Pick<MigratedProduct, "customizationOptions" | "allowsLogoUpload" | "allowsCustomDesign" | "designMode">
): CustomizationLevel {
  if (
    product.allowsCustomDesign ||
    product.designMode === "logo" ||
    product.designMode === "custom" ||
    product.customizationOptions.includes("add_logo") ||
    product.customizationOptions.includes("custom_design")
  ) {
    return "BRANDED";
  }

  return "STANDARD";
}

export function getPurchaseOptionDestinationMode(option: Pick<PurchaseOption, "id" | "accountRequired" | "requiresSubscription">): DestinationMode {
  return option.id === "hosted_multilink" || option.accountRequired || option.requiresSubscription ? "HOSTED" : "DIRECT";
}

export function getPurchaseOptionCustomizationLevel(
  option: Pick<PurchaseOption, "id" | "requiresLogo" | "requiresBusinessName" | "requiresFinalProof" | "requiresDesignStep">
): CustomizationLevel {
  return option.id === "branded_qr_direct" ||
    option.id === "hosted_multilink" ||
    option.requiresLogo ||
    option.requiresBusinessName ||
    option.requiresFinalProof ||
    option.requiresDesignStep
    ? "BRANDED"
    : "STANDARD";
}

export function getCanonicalProductModel(product: MigratedProduct): CanonicalProductModel {
  return {
    destinationMode: getProductDestinationMode(product),
    customizationLevel: getProductCustomizationLevel(product)
  };
}

export function isDirectPurchaseOption(option: Pick<PurchaseOption, "id" | "accountRequired" | "requiresSubscription">) {
  return getPurchaseOptionDestinationMode(option) === "DIRECT";
}

export function isHostedPurchaseOption(option: Pick<PurchaseOption, "id" | "accountRequired" | "requiresSubscription">) {
  return getPurchaseOptionDestinationMode(option) === "HOSTED";
}

export function isProductOptionArchitectureConsistent(product: MigratedProduct, option: PurchaseOption) {
  const productMode = getProductDestinationMode(product);
  const optionMode = getPurchaseOptionDestinationMode(option);

  if (productMode === "DIRECT" && optionMode === "HOSTED") {
    return false;
  }

  return true;
}

export function getProductDestinationTargets({
  destinationMode,
  directDestinationUrl,
  hostedPageCode,
  siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://taprater.com"
}: {
  destinationMode: DestinationMode;
  directDestinationUrl?: string;
  hostedPageCode?: string;
  siteUrl?: string;
}): ProductDestinationTargets {
  if (destinationMode === "DIRECT") {
    if (!directDestinationUrl) {
      return { ok: false, destinationMode, reason: "missing_direct_destination" };
    }

    if (!isHttpUrl(directDestinationUrl)) {
      return { ok: false, destinationMode, reason: "invalid_url" };
    }

    return {
      ok: true,
      destinationMode,
      qrDestinationUrl: directDestinationUrl,
      nfcDestinationUrl: directDestinationUrl
    };
  }

  if (!hostedPageCode) {
    return { ok: false, destinationMode, reason: "missing_hosted_code" };
  }

  const hostedUrl = `${siteUrl.replace(/\/+$/, "")}/p/${encodeURIComponent(hostedPageCode)}`;
  return {
    ok: true,
    destinationMode,
    qrDestinationUrl: hostedUrl,
    nfcDestinationUrl: hostedUrl
  };
}

export function cartItemRequestsPermanentHostedCode(item: Pick<CartItem, "setup">) {
  const setup = item.setup ?? {};
  return Boolean(readString((setup as Record<string, unknown>).hostedPageCode) || readString((setup as Record<string, unknown>).permanentPageCode));
}

export function purchaseOptionIdToCustomizationLevel(optionId: PurchaseOptionId | string | undefined): CustomizationLevel {
  return optionId === "branded_qr_direct" || optionId === "hosted_multilink" ? "BRANDED" : "STANDARD";
}

export function getProductBaseSku(product: Pick<MigratedProduct, "slug" | "sku">): string {
  return controlledProductSkuBases[product.slug] ?? product.sku;
}

export function getDefaultProductSize(product: Pick<MigratedProduct, "sizeOptions">) {
  return product.sizeOptions?.find((size) => size.isDefault && size.isActive) ?? product.sizeOptions?.find((size) => size.isActive);
}

export function getDefaultProductColor(product: Pick<MigratedProduct, "colorOptions">) {
  return product.colorOptions?.find((color) => color.isDefault && color.isActive) ?? product.colorOptions?.find((color) => color.isActive);
}

export function getConfiguredUnitPriceCents(product: Pick<MigratedProduct, "sizeOptions" | "colorOptions">, option: Pick<PurchaseOption, "priceCents">, selection: Pick<ProductVariantSelection, "sizeCode" | "colorCode">) {
  if (!product.sizeOptions?.length) {
    return option.priceCents;
  }

  const size = product.sizeOptions?.find((item) => item.code === selection.sizeCode) ?? getDefaultProductSize(product);
  const color = product.colorOptions?.find((item) => item.code === selection.colorCode) ?? getDefaultProductColor(product);
  if (!size?.isActive || size.priceAdjustmentCents === null) {
    return null;
  }

  return option.priceCents + size.priceAdjustmentCents + (color?.priceAdjustmentCents ?? 0);
}

export function generateProductVariantSku(product: Pick<MigratedProduct, "slug" | "sku" | "sizeOptions" | "colorOptions">, selection: ProductVariantSelection) {
  const size = product.sizeOptions?.find((item) => item.code === selection.sizeCode) ?? getDefaultProductSize(product);
  const color = product.colorOptions?.find((item) => item.code === selection.colorCode) ?? getDefaultProductColor(product);
  return [getProductBaseSku(product), purchaseOptionSkuCodes[selection.purchaseOptionId], size?.skuSuffix, color?.skuSuffix].filter(Boolean).join("-");
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
