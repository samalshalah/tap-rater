import type { MigratedProduct } from "@/data/migrated-products";
import { maxCartItemQuantity, type CartItem, type CartMultiLinkButton } from "@/lib/cart";
import {
  cartItemRequestsPermanentHostedCode,
  generateProductVariantSku,
  getConfiguredUnitPriceCents,
  getDefaultProductColor,
  getDefaultProductSize,
  getProductBaseSku,
  getPurchaseOptionCustomizationLevel,
  getPurchaseOptionDestinationMode,
  isProductOptionArchitectureConsistent,
  type CustomizationLevel,
  type DestinationMode
} from "@/lib/product-model";
import { getProductPurchaseOptions, isHostedPurchaseOptionEnabled, type PurchaseOption, type PurchaseOptionId } from "@/lib/purchase-options";
import { buildDirectProductionTargets, isHttpUrl, isProofApprovalSnapshotCurrent } from "@/lib/direct-production";
import { hostedMultiLinkServiceAddon, productSupportsMultiLink } from "@/lib/service-addons";
import { brandedStandComposition } from "@/lib/branded-composition";

export {
  STRIPE_CHECKOUT_TIMEOUT_MS,
  CheckoutTimeoutError,
  isCheckoutTimeoutError,
  withTimeout,
  buildStripeCheckoutLineItems,
  createCheckoutSessionParams,
  isStripeTestSecretKey,
  isStripeLiveSecretKey,
  isStripeTestPublishableKey,
  isStripeLivePublishableKey,
  getStripeMode,
  getStripeModeSafe,
  validateStripeRuntimeConfig,
  validateStripeWebhookConfig,
  getStripeSecretKey,
  getStripeClient,
  getCheckoutSiteUrl,
  getStripePublishableKey
} from "@/lib/checkout-stripe";
export type { StripeMode, StripeRuntimeConfig } from "@/lib/checkout-stripe";

export type CheckoutCartRow = {
  productId: string;
  optionId: PurchaseOptionId;
  optionLabel: string;
  title: string;
  sku: string;
  baseSku?: string;
  destinationMode: DestinationMode;
  customizationLevel: CustomizationLevel;
  quantity: number;
  unitAmountCents: number;
  lineSubtotalCents: number;
  discountCents?: number;
  offerId?: string;
  offerLabel?: string;
  monthlyAmountCents?: number;
  shortDescription: string;
  setup: NonNullable<CartItem["setup"]>;
  logoRequired: boolean;
  logoStatus: "not_required" | "uploaded" | "manual_collection_required";
  logoReference?: string | null;
  proofRequired: boolean;
  proofApproved: boolean;
  productionStatus: "ready_for_direct_fulfillment" | "pending_branded_proof_review" | "pending_manual_logo_and_proof" | "pending_manual_design_and_proof";
  manualProductionRequired: boolean;
  productionWarningCodes: ManualProductionWarningCode[];
};

export type ManualProductionWarningCode =
  | "pending_manual_proof"
  | "asset_storage_not_configured"
  | "artwork_generation_failed"
  | "do_not_print_until_manual_review";

const manualProductionWarningCodes: ManualProductionWarningCode[] = [
  "pending_manual_proof",
  "asset_storage_not_configured",
  "artwork_generation_failed",
  "do_not_print_until_manual_review"
];

export type ValidatedCheckoutCart =
  | {
      ok: true;
      rows: CheckoutCartRow[];
      totalCents: number;
      recurringTotalCents: number;
      checkoutMode: "payment" | "subscription";
      currency: "usd";
    }
  | {
      ok: false;
      reason: "empty_cart";
      message: string;
    };

export function validateCheckoutCart(items: CartItem[], products: MigratedProduct[]): ValidatedCheckoutCart {
  const productById = new Map(
    products
      .filter((product) => product.isActive && product.status !== "draft" && product.status !== "archived" && product.stockStatus === "instock" && (product.checkoutMode === "buy_now" || product.checkoutMode === "subscription"))
      .map((product) => [product.slug, product])
  );
  const rows: CheckoutCartRow[] = [];

  for (const item of items) {
    const product = productById.get(item.productId);
    const productOptions = product ? getProductPurchaseOptions(product) : [];
    const optionId = item.optionId ?? item.setup?.optionCode;
    const option = optionId ? productOptions.find((purchaseOption) => purchaseOption.id === optionId) : productOptions[0];

    if (!Number.isInteger(item.quantity) || item.quantity <= 0 || item.quantity > maxCartItemQuantity || !product || !option) {
      continue;
    }

    const setup = normalizeCheckoutSetup(item.setup);
    setup.productSlug = product.slug;
    setup.optionCode = option.id;
    setup.hasQr = option.id !== "standard_direct" && option.hasQr;
    setup.nfcOnly = !setup.hasQr;
    if (!setup.hasQr) {
      setup.generatedQrValue = undefined;
      setup.qrTargetUrl = undefined;
    }
    if (option.id === "branded_qr_direct") {
      setup.frontTemplateUrl = product.assetSet?.brandedFrontTemplateUrl;
    }
    const hasMultiLinkAddon =
      setup.serviceAddon === hostedMultiLinkServiceAddon.code && productSupportsMultiLink(product) && isHostedPurchaseOptionEnabled();

    if (setup.serviceAddon === hostedMultiLinkServiceAddon.code && !hasMultiLinkAddon) {
      continue;
    }

    if (!isProductOptionArchitectureConsistent(product, option) || cartItemRequestsPermanentHostedCode(item) || !isValidCheckoutSetup(option, setup, hasMultiLinkAddon)) {
      continue;
    }

    const destinationMode = hasMultiLinkAddon ? "HOSTED" : getPurchaseOptionDestinationMode(option);
    if (!hasMultiLinkAddon && destinationMode === "HOSTED" && (product.checkoutMode !== "subscription" || !option.requiresSubscription || !option.monthlyPriceCents)) {
      continue;
    }

    if (destinationMode === "DIRECT" && (product.checkoutMode !== "buy_now" || option.requiresSubscription)) {
      continue;
    }

    const customizationLevel = getPurchaseOptionCustomizationLevel(option);
    const selectedSize = product.sizeOptions?.find((size) => size.code === setup.sizeCode) ?? getDefaultProductSize(product);
    const selectedColor = product.colorOptions?.find((color) => color.code === setup.colorCode) ?? getDefaultProductColor(product);
    const unitPriceCents = getConfiguredUnitPriceCents(product, option, {
      sizeCode: selectedSize?.code,
      colorCode: selectedColor?.code
    });
    if (unitPriceCents === null) {
      continue;
    }
    const baseSku = getProductBaseSku(product);
    const finalSku = generateProductVariantSku(product, {
      purchaseOptionId: option.id,
      sizeCode: selectedSize?.code,
      colorCode: selectedColor?.code
    });
    const directTargets = destinationMode === "DIRECT" ? buildDirectProductionTargets(setup.destinationUrl) : null;
    const rowSetup = directTargets
      ? {
          ...setup,
          baseSku,
          finalSku,
          purchaseOptionLabel: option.label,
          sizeCode: selectedSize?.code,
          sizeLabel: selectedSize?.label,
          colorCode: selectedColor?.code,
          colorLabel: selectedColor?.label,
          destinationUrl: directTargets.destinationUrl,
          generatedQrValue: setup.hasQr ? directTargets.qrTargetUrl : undefined,
          qrTargetUrl: setup.hasQr ? directTargets.qrTargetUrl : undefined,
          nfcTargetUrl: directTargets.nfcTargetUrl,
          hasQr: setup.hasQr,
          nfcOnly: setup.nfcOnly
        }
      : setup;
    const manualDesignFlow = option.id === "branded_qr_direct" && rowSetup.designAssistanceRequested === true;
    const logoRequired = option.requiresLogo;
    const proofRequired = option.requiresFinalProof;
    const proofApproved = proofRequired ? isApprovedProofCurrent(option, rowSetup) : rowSetup.proofApproved === true;
    if (option.id === "branded_qr_direct" && (!proofApproved || !rowSetup.proofReceiptId || rowSetup.rendererVersion !== brandedStandComposition.templateVersion || !rowSetup.baseTemplateContentHash || !rowSetup.logoContentHash || (hasMultiLinkAddon && (!rowSetup.hostedReservationId || item.quantity !== 1)))) {
      return { ok: false, reason: "empty_cart", message: "Preview and approve your Branded stand again before payment." };
    }
    const manualProductionRequired = option.id === "branded_qr_direct" ? manualDesignFlow || !proofApproved : false;
    const productionStatus =
      manualDesignFlow
        ? "pending_manual_logo_and_proof"
        : option.id === "branded_qr_direct"
          ? proofApproved
            ? "ready_for_direct_fulfillment"
            : "pending_branded_proof_review"
          : "ready_for_direct_fulfillment";
    const logoReference = rowSetup.logoStorageKey ?? rowSetup.logoMediaUrl ?? null;
    const productionWarningCodes: ManualProductionWarningCode[] = manualDesignFlow ? ["pending_manual_proof", "do_not_print_until_manual_review"] : [];

    rows.push({
      productId: product.slug,
      optionId: option.id,
      optionLabel: option.label,
      title: product.title,
      sku: finalSku,
      baseSku,
      destinationMode,
      customizationLevel,
      quantity: item.quantity,
      unitAmountCents: unitPriceCents,
      lineSubtotalCents: unitPriceCents * item.quantity,
      monthlyAmountCents: hasMultiLinkAddon ? hostedMultiLinkServiceAddon.monthlyPriceCents : option.monthlyPriceCents,
      shortDescription: product.shortDescription,
      setup: rowSetup,
      logoRequired,
      logoStatus: logoRequired ? logoReference ? "uploaded" : "manual_collection_required" : "not_required",
      logoReference,
      proofRequired,
      proofApproved,
      productionStatus,
      manualProductionRequired,
      productionWarningCodes
    });
  }

  if (rows.length === 0 || rows.length !== items.length) {
    return { ok: false, reason: "empty_cart", message: "Your cart is empty or contains unavailable products." };
  }

  return {
    ok: true,
    rows,
    totalCents: rows.reduce((sum, row) => sum + row.lineSubtotalCents, 0),
    recurringTotalCents: rows.reduce((sum, row) => sum + (row.monthlyAmountCents ?? 0) * row.quantity, 0),
    checkoutMode: rows.some((row) => row.destinationMode === "HOSTED") ? "subscription" : "payment",
    currency: "usd"
  };
}

function normalizeCheckoutSetup(setup: CartItem["setup"]): NonNullable<CartItem["setup"]> {
  return {
    proofReceiptId: setup?.proofReceiptId,
    hostedReservationId: setup?.hostedReservationId,
    rendererVersion: setup?.rendererVersion,
    baseTemplateContentHash: setup?.baseTemplateContentHash,
    logoContentHash: setup?.logoContentHash,
    productSlug: setup?.productSlug?.trim(),
    optionCode: setup?.optionCode,
    baseSku: setup?.baseSku?.trim(),
    finalSku: setup?.finalSku?.trim(),
    purchaseOptionLabel: setup?.purchaseOptionLabel?.trim(),
    sizeCode: setup?.sizeCode?.trim(),
    sizeLabel: setup?.sizeLabel?.trim(),
    colorCode: setup?.colorCode?.trim(),
    colorLabel: setup?.colorLabel?.trim(),
    destinationUrl: setup?.destinationUrl?.trim(),
    destinationType: setup?.destinationType?.trim(),
    serviceMode: setup?.serviceMode,
    serviceAddon: setup?.serviceAddon?.trim(),
    monthlyPriceCents: setup?.monthlyPriceCents,
    multiLinkButtons: normalizeMultiLinkCheckoutButtons(setup?.multiLinkButtons),
    multiLinkLinksSkipped: setup?.multiLinkLinksSkipped === true,
    platformSlug: setup?.platformSlug?.trim(),
    googlePlaceId: setup?.googlePlaceId?.trim(),
    googlePlaceName: setup?.googlePlaceName?.trim(),
    businessName: setup?.businessName?.trim(),
    headline: setup?.headline?.trim(),
    cta: setup?.cta?.trim(),
    logoFileName: setup?.logoFileName?.trim(),
    logoMediaUrl: setup?.logoMediaUrl?.trim(),
    logoStorageKey: setup?.logoStorageKey?.trim(),
    originalLogoMediaUrl: setup?.originalLogoMediaUrl?.trim(),
    originalLogoStorageKey: setup?.originalLogoStorageKey?.trim(),
    designAssistanceRequested: setup?.designAssistanceRequested === true,
    logoBackgroundMode: setup?.logoBackgroundMode?.trim(),
    logoFitMode: setup?.logoFitMode?.trim(),
    logoOffsetXPercent: setup?.logoOffsetXPercent,
    logoOffsetYPercent: setup?.logoOffsetYPercent,
    generatedQrValue: setup?.generatedQrValue?.trim(),
    qrTargetUrl: setup?.qrTargetUrl?.trim(),
    nfcTargetUrl: setup?.nfcTargetUrl?.trim(),
    frontTemplateUrl: setup?.frontTemplateUrl?.trim(),
    centerAssetUrl: setup?.centerAssetUrl?.trim(),
    ctaText: setup?.ctaText?.trim(),
    fontSizePercent: setup?.fontSizePercent,
    logoSizePercent: setup?.logoSizePercent,
    showBusinessNameOnProof: typeof setup?.showBusinessNameOnProof === "boolean" ? setup.showBusinessNameOnProof : undefined,
    proofApprovalSnapshot: setup?.proofApprovalSnapshot,
    proofApprovedAt: setup?.proofApprovedAt?.trim(),
    proofPreviewData: setup?.proofPreviewData,
    hasQr: setup?.hasQr,
    nfcOnly: setup?.nfcOnly,
    priceCents: setup?.priceCents,
    designNotes: setup?.designNotes?.trim(),
    proofApproved: setup?.proofApproved === true,
    manualCollectionAcknowledged: setup?.manualCollectionAcknowledged === true
  };
}

function isValidCheckoutSetup(option: PurchaseOption, setup: NonNullable<CartItem["setup"]>, hasMultiLinkAddon = false) {
  if (getPurchaseOptionDestinationMode(option) === "DIRECT" && !option.requiresDestinationUrl) {
    return false;
  }

  if (getPurchaseOptionDestinationMode(option) === "HOSTED" && option.requiresDestinationUrl) {
    return false;
  }

  if (!hasMultiLinkAddon && option.requiresDestinationUrl && !isHttpUrl(setup.destinationUrl)) {
    return false;
  }

  const directTargets = getPurchaseOptionDestinationMode(option) === "DIRECT" && !hasMultiLinkAddon ? buildDirectProductionTargets(setup.destinationUrl) : null;

  if (getPurchaseOptionDestinationMode(option) === "DIRECT" && !hasMultiLinkAddon && !directTargets) {
    return false;
  }

  if (option.requiresBusinessName && !setup.businessName) {
    return false;
  }

  if (option.requiresCustomText && !setup.headline) {
    return false;
  }

  if (hasMultiLinkAddon && !isValidMultiLinkCheckoutButtons(setup.multiLinkButtons)) {
    return false;
  }

  if (option.id === "branded_qr_direct") {
    if (!setup.logoMediaUrl && !setup.logoStorageKey) {
      return false;
    }

    if (!setup.generatedQrValue || !isHttpUrl(setup.generatedQrValue)) {
      return false;
    }

    if (!setup.frontTemplateUrl) {
      return false;
    }

    return true;
  }

  return true;
}

function normalizeMultiLinkCheckoutButtons(buttons: CartMultiLinkButton[] | undefined) {
  if (!Array.isArray(buttons)) return undefined;

  const normalized = buttons.flatMap((button, index) => {
    const id = button.id?.trim();
    const type = button.type?.trim();
    const label = button.label?.trim();
    const url = button.url?.trim();
    if (!id || !type || !label || !url) return [];

    return [
      {
        id,
        type,
        label,
        url,
        enabled: button.enabled !== false,
        position: Number.isInteger(button.position) ? button.position : index
      }
    ];
  });

  return normalized.length ? normalized.slice(0, 10).map((button, index) => ({ ...button, position: index })) : undefined;
}

function isValidMultiLinkCheckoutButtons(buttons: NonNullable<CartItem["setup"]>["multiLinkButtons"]) {
  if (!buttons) return true;

  return buttons.every((button) => {
    if (!button.enabled) return true;
    return Boolean(button.label?.trim() && isHttpUrl(button.url));
  });
}

function isApprovedProofCurrent(option: PurchaseOption, setup: NonNullable<CartItem["setup"]>) {
  if (option.id !== "branded_qr_direct") {
    return setup.proofApproved === true;
  }

  return setup.proofApproved === true && isProofApprovalSnapshotCurrent({
    rendererVersion: setup.rendererVersion,
    baseTemplateContentHash: setup.baseTemplateContentHash,
    logoContentHash: setup.logoContentHash,
    productSlug: setup.productSlug,
    optionCode: setup.optionCode,
    destinationUrl: setup.destinationUrl,
    businessName: setup.businessName,
    logoStorageKey: setup.logoStorageKey,
    logoMediaUrl: setup.logoMediaUrl,
    generatedQrValue: setup.generatedQrValue,
    frontTemplateUrl: setup.frontTemplateUrl,
    fontSizePercent: setup.fontSizePercent,
    logoSizePercent: setup.logoSizePercent,
    showBusinessNameOnProof: setup.showBusinessNameOnProof,
    logoBackgroundMode: setup.logoBackgroundMode,
    logoFitMode: setup.logoFitMode,
    logoOffsetXPercent: setup.logoOffsetXPercent,
    logoOffsetYPercent: setup.logoOffsetYPercent
  }, setup.proofApprovalSnapshot);
}
