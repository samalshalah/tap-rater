import Stripe from "stripe";
import type { MigratedProduct } from "@/data/migrated-products";
import type { CartItem } from "@/lib/cart";
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
import { getDefaultShippingSettings, type ShippingSettingsInput } from "@/lib/shipping-settings";
import { buildDirectProductionTargets, isHttpUrl, isProofApprovalSnapshotCurrent } from "@/lib/direct-production";
import { hostedMultiLinkServiceAddon, productSupportsMultiLink } from "@/lib/service-addons";

export const STRIPE_CHECKOUT_TIMEOUT_MS = 12_000;

export class CheckoutTimeoutError extends Error {
  constructor(
    public readonly label: string,
    public readonly timeoutMs: number
  ) {
    super(`${label} timed out after ${timeoutMs}ms.`);
    this.name = "CheckoutTimeoutError";
  }
}

export function isCheckoutTimeoutError(value: unknown): value is CheckoutTimeoutError {
  return Boolean(value instanceof CheckoutTimeoutError || (value && typeof value === "object" && (value as Error).name === "CheckoutTimeoutError"));
}

export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new CheckoutTimeoutError(label, timeoutMs)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

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

export type StripeMode = "test" | "live";

export type StripeRuntimeConfig =
  | {
      ok: true;
      mode: StripeMode;
      secretKey: string;
      publishableKey: string;
      webhookSecret?: string;
    }
  | {
      ok: false;
      mode: StripeMode | "invalid";
      error: string;
    };

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
      .filter((product) => product.isActive && product.stockStatus === "instock" && (product.checkoutMode === "buy_now" || product.checkoutMode === "subscription"))
      .map((product) => [product.slug, product])
  );
  const rows: CheckoutCartRow[] = [];

  for (const item of items) {
    const product = productById.get(item.productId);
    const productOptions = product ? getProductPurchaseOptions(product) : [];
    const optionId = item.optionId ?? item.setup?.optionCode;
    const option = optionId ? productOptions.find((purchaseOption) => purchaseOption.id === optionId) : productOptions[0];

    if (!Number.isInteger(item.quantity) || item.quantity <= 0 || !product || !option) {
      continue;
    }

    const setup = normalizeCheckoutSetup(item.setup);
    const hasMultiLinkAddon =
      setup.serviceAddon === hostedMultiLinkServiceAddon.code && productSupportsMultiLink(product) && isHostedPurchaseOptionEnabled();

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
          generatedQrValue: setup.generatedQrValue ?? directTargets.qrTargetUrl,
          qrTargetUrl: directTargets.qrTargetUrl,
          nfcTargetUrl: directTargets.nfcTargetUrl,
          hasQr: true,
          nfcOnly: false
        }
      : setup;
    const manualDesignFlow = option.id === "branded_qr_direct" && rowSetup.designAssistanceRequested === true;
    const logoRequired = option.requiresLogo;
    const proofRequired = option.requiresFinalProof;
    const proofApproved = proofRequired ? isApprovedProofCurrent(option, rowSetup) : rowSetup.proofApproved === true;
    const manualProductionRequired = option.id === "branded_qr_direct" ? manualDesignFlow || !proofApproved : false;
    const productionStatus =
      manualDesignFlow
        ? "pending_manual_logo_and_proof"
        : option.id === "branded_qr_direct"
          ? "ready_for_direct_fulfillment"
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

  if (rows.length === 0) {
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

export function buildStripeCheckoutLineItems(rows: CheckoutCartRow[]): Stripe.Checkout.SessionCreateParams.LineItem[] {
  return rows.flatMap((row) => {
    const productData = {
      name: row.title,
      description: `${row.optionLabel} - ${row.shortDescription}`,
      metadata: {
        product_id: row.productId,
        option_id: row.optionId,
        sku: row.sku
      }
    };
    const physicalLine: Stripe.Checkout.SessionCreateParams.LineItem = {
      quantity: row.quantity,
      price_data: {
        currency: "usd",
        product_data: productData,
        unit_amount: row.unitAmountCents
      }
    };

    if (row.destinationMode !== "HOSTED") {
      return [physicalLine];
    }

    return [
      physicalLine,
      {
        quantity: row.quantity,
        price_data: {
          currency: "usd",
          product_data: {
            ...productData,
            name: `${row.title} monthly hosting`,
            metadata: {
              ...productData.metadata,
              line_kind: "hosted_subscription"
            }
          },
          recurring: {
            interval: "month"
          },
          unit_amount: row.monthlyAmountCents ?? 0
        }
      }
    ];
  });
}

export function createCheckoutSessionParams({
  cart,
  siteUrl,
  stripeMode = getStripeMode(),
  shippingSettings = getDefaultShippingSettings()
}: {
  cart: Extract<ValidatedCheckoutCart, { ok: true }>;
  siteUrl: string;
  stripeMode?: StripeMode;
  shippingSettings?: ShippingSettingsInput;
}): Stripe.Checkout.SessionCreateParams {
  const normalizedSiteUrl = siteUrl.replace(/\/+$/, "");
  const allowedCountries = shippingSettings.allowedCountryCodes as Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[];
  const shippingOptions = buildStripeShippingOptions(shippingSettings);

  return {
    mode: cart.checkoutMode,
    ui_mode: "embedded_page",
    payment_method_types: ["card"],
    line_items: buildStripeCheckoutLineItems(cart.rows),
    return_url: `${normalizedSiteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    billing_address_collection: "auto",
    shipping_address_collection: {
      allowed_countries: allowedCountries.length > 0 ? allowedCountries : ["US"]
    },
    ...(shippingOptions.length > 0 ? { shipping_options: shippingOptions } : {}),
    phone_number_collection: {
      enabled: true
    },
    metadata: {
      stripe_mode: stripeMode,
      total_cents: String(cart.totalCents),
      recurring_total_cents: String(cart.recurringTotalCents),
      configured_items: String(cart.rows.length),
      checkout_intent: cart.checkoutMode === "subscription" ? "hosted_subscription" : "direct_payment",
      shipping_mode: shippingSettings.shippingMode,
      shipping_amount_cents: String(settingsShippingAmountCents(shippingSettings))
    }
  };
}

function settingsShippingAmountCents(settings: ShippingSettingsInput) {
  return settings.shippingMode === "flat" ? settings.flatShippingAmountCents : 0;
}

function buildStripeShippingOptions(settings: ShippingSettingsInput): Stripe.Checkout.SessionCreateParams.ShippingOption[] {
  if (settings.shippingMode === "manual") {
    return [];
  }

  const amount = settings.shippingMode === "flat" ? settings.flatShippingAmountCents : 0;
  const displayName = settings.shippingMode === "flat" ? "Flat rate shipping" : "Free shipping";

  return [
    {
      shipping_rate_data: {
        type: "fixed_amount",
        display_name: displayName,
        fixed_amount: {
          amount,
          currency: "usd"
        }
      }
    }
  ];
}

function normalizeCheckoutSetup(setup: CartItem["setup"]): NonNullable<CartItem["setup"]> {
  return {
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

  if (directTargets) {
    if (setup.qrTargetUrl && setup.qrTargetUrl !== directTargets.qrTargetUrl) {
      return false;
    }

    if (setup.nfcTargetUrl && setup.nfcTargetUrl !== directTargets.nfcTargetUrl) {
      return false;
    }

    if (setup.generatedQrValue && setup.generatedQrValue !== directTargets.qrTargetUrl) {
      return false;
    }
  }

  if (option.requiresBusinessName && !setup.businessName) {
    return false;
  }

  if (option.requiresCustomText && !setup.headline) {
    return false;
  }

  if (option.id === "branded_qr_direct") {
    const manualDesignFlow = setup.designAssistanceRequested === true;

    if (!manualDesignFlow && !setup.logoMediaUrl && !setup.logoStorageKey) {
      return false;
    }

    if (!setup.generatedQrValue || !isHttpUrl(setup.generatedQrValue)) {
      return false;
    }

    if (!setup.frontTemplateUrl) {
      return false;
    }

    if (manualDesignFlow) {
      return setup.manualCollectionAcknowledged === true;
    }

    if (!setup.proofPreviewData || !isApprovedProofCurrent(option, setup)) {
      return false;
    }
  }

  return true;
}

function isApprovedProofCurrent(option: PurchaseOption, setup: NonNullable<CartItem["setup"]>) {
  if (option.id !== "branded_qr_direct") {
    return setup.proofApproved === true;
  }

  return setup.proofApproved === true && isProofApprovalSnapshotCurrent({
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
    logoBackgroundMode: setup.logoBackgroundMode,
    logoFitMode: setup.logoFitMode,
    logoOffsetXPercent: setup.logoOffsetXPercent,
    logoOffsetYPercent: setup.logoOffsetYPercent
  }, setup.proofApprovalSnapshot);
}

export function isStripeTestSecretKey(value: string | undefined) {
  return Boolean(value?.startsWith("sk_test_"));
}

export function isStripeLiveSecretKey(value: string | undefined) {
  return Boolean(value?.startsWith("sk_live_"));
}

export function isStripeTestPublishableKey(value: string | undefined) {
  return Boolean(value?.startsWith("pk_test_"));
}

export function isStripeLivePublishableKey(value: string | undefined) {
  return Boolean(value?.startsWith("pk_live_"));
}

export function getStripeMode(value = process.env.STRIPE_MODE): StripeMode {
  if (!value) {
    return "test";
  }

  if (value === "test" || value === "live") {
    return value;
  }

  throw new Error("STRIPE_MODE must be either test or live.");
}

export function getStripeModeSafe(value = process.env.STRIPE_MODE): StripeMode | "invalid" {
  try {
    return getStripeMode(value);
  } catch {
    return "invalid";
  }
}

export function validateStripeRuntimeConfig(env: NodeJS.ProcessEnv = process.env): StripeRuntimeConfig {
  const mode = getStripeModeSafe(env.STRIPE_MODE);

  if (mode === "invalid") {
    return {
      ok: false,
      mode,
      error: "Stripe mode is invalid. Set STRIPE_MODE to test or live."
    };
  }

  const secretKey = env.STRIPE_SECRET_KEY;
  const publishableKey = env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const webhookSecret = env.STRIPE_WEBHOOK_SECRET;

  if (mode === "test") {
    if (!isStripeTestSecretKey(secretKey)) {
      return {
        ok: false,
        mode,
        error: "Stripe test mode is not configured. Use sk_test_ and pk_test_ keys only."
      };
    }

    if (!isStripeTestPublishableKey(publishableKey)) {
      return {
        ok: false,
        mode,
        error: "Stripe test mode is not configured. Use sk_test_ and pk_test_ keys only."
      };
    }
  }

  if (mode === "live") {
    if (!isStripeLiveSecretKey(secretKey)) {
      return {
        ok: false,
        mode,
        error: "Stripe live mode is not configured. Use sk_live_ and pk_live_ keys only."
      };
    }

    if (!isStripeLivePublishableKey(publishableKey)) {
      return {
        ok: false,
        mode,
        error: "Stripe live mode is not configured. Use sk_live_ and pk_live_ keys only."
      };
    }

    if (!webhookSecret) {
      return {
        ok: false,
        mode,
        error: "Stripe live webhook is not configured."
      };
    }
  }

  return {
    ok: true,
    mode,
    secretKey: secretKey!,
    publishableKey: publishableKey!,
    webhookSecret
  };
}

export function validateStripeWebhookConfig(env: NodeJS.ProcessEnv = process.env): StripeRuntimeConfig {
  const config = validateStripeRuntimeConfig(env);

  if (!config.ok) {
    return config;
  }

  if (!config.webhookSecret) {
    return {
      ok: false,
      mode: config.mode,
      error: config.mode === "live" ? "Stripe live webhook is not configured." : "Stripe test webhook is not configured."
    };
  }

  return config;
}

export function getStripeSecretKey() {
  const config = validateStripeRuntimeConfig();

  if (!config.ok) {
    throw new Error(config.error);
  }

  return config.secretKey;
}

export function getStripeClient() {
  return new Stripe(getStripeSecretKey(), {
    httpClient: Stripe.createFetchHttpClient(),
    maxNetworkRetries: 0
  });
}

export function getCheckoutSiteUrl(requestOrigin?: string | null) {
  if (requestOrigin && /^https?:\/\//i.test(requestOrigin)) {
    return requestOrigin;
  }

  return process.env.NEXT_PUBLIC_SITE_URL || "http://127.0.0.1:3000";
}
