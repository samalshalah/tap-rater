import Stripe from "stripe";
import type { MigratedProduct } from "@/data/migrated-products";
import type { CartItem } from "@/lib/cart";
import { getProductPurchaseOptions, type PurchaseOption, type PurchaseOptionId } from "@/lib/purchase-options";

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
  quantity: number;
  unitAmountCents: number;
  lineSubtotalCents: number;
  shortDescription: string;
  setup: NonNullable<CartItem["setup"]>;
  logoRequired: boolean;
  logoStatus: "not_required" | "uploaded" | "manual_collection_required";
  logoReference?: string | null;
  proofRequired: boolean;
  proofApproved: boolean;
  productionStatus: "ready_for_direct_activation" | "pending_branded_proof_review" | "pending_manual_logo_and_proof" | "pending_manual_design_and_proof";
  manualProductionRequired: boolean;
  productionWarningCodes: ManualProductionWarningCode[];
};

export type ManualProductionWarningCode =
  | "pending_manual_proof"
  | "asset_storage_not_configured"
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
  "do_not_print_until_manual_review"
];

export type ValidatedCheckoutCart =
  | {
      ok: true;
      rows: CheckoutCartRow[];
      totalCents: number;
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
      .filter((product) => product.isActive && product.stockStatus === "instock" && product.checkoutMode === "buy_now")
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

    if (option.requiresSubscription || !isValidCheckoutSetup(option, setup)) {
      continue;
    }

    const logoRequired = option.requiresLogo;
    const proofRequired = option.requiresFinalProof;
    const proofApproved = proofRequired ? setup.proofApproved === true : setup.proofApproved === true;
    const manualProductionRequired = option.id === "branded_qr_direct";
    const productionStatus =
      option.id === "branded_qr_direct"
          ? "pending_branded_proof_review"
          : "ready_for_direct_activation";
    const logoReference = setup.logoStorageKey ?? setup.logoMediaUrl ?? null;

    rows.push({
      productId: product.slug,
      optionId: option.id,
      optionLabel: option.label,
      title: product.title,
      sku: product.sku,
      quantity: item.quantity,
      unitAmountCents: option.priceCents,
      lineSubtotalCents: option.priceCents * item.quantity,
      shortDescription: product.shortDescription,
      setup,
      logoRequired,
      logoStatus: logoRequired ? "uploaded" : "not_required",
      logoReference,
      proofRequired,
      proofApproved,
      productionStatus,
      manualProductionRequired,
      productionWarningCodes: manualProductionRequired ? ["pending_manual_proof", "do_not_print_until_manual_review"] : []
    });
  }

  if (rows.length === 0) {
    return { ok: false, reason: "empty_cart", message: "Your cart is empty or contains unavailable products." };
  }

  return {
    ok: true,
    rows,
    totalCents: rows.reduce((sum, row) => sum + row.lineSubtotalCents, 0),
    currency: "usd"
  };
}

export function buildStripeCheckoutLineItems(rows: CheckoutCartRow[]): Stripe.Checkout.SessionCreateParams.LineItem[] {
  return rows.map((row) => ({
    quantity: row.quantity,
    price_data: {
      currency: "usd",
      product_data: {
        name: row.title,
        description: `${row.optionLabel} - ${row.shortDescription}`,
        metadata: {
          product_id: row.productId,
          option_id: row.optionId,
          sku: row.sku
        }
      },
      unit_amount: row.unitAmountCents
    }
  }));
}

export function createCheckoutSessionParams({
  cart,
  siteUrl,
  stripeMode = getStripeMode()
}: {
  cart: Extract<ValidatedCheckoutCart, { ok: true }>;
  siteUrl: string;
  stripeMode?: StripeMode;
}): Stripe.Checkout.SessionCreateParams {
  const normalizedSiteUrl = siteUrl.replace(/\/+$/, "");

  return {
    mode: "payment",
    payment_method_types: ["card"],
    line_items: buildStripeCheckoutLineItems(cart.rows),
    success_url: `${normalizedSiteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${normalizedSiteUrl}/checkout/cancel`,
    billing_address_collection: "auto",
    shipping_address_collection: {
      allowed_countries: ["US"]
    },
    phone_number_collection: {
      enabled: true
    },
    metadata: {
      stripe_mode: stripeMode,
      total_cents: String(cart.totalCents),
      configured_items: String(cart.rows.length)
    }
  };
}

function normalizeCheckoutSetup(setup: CartItem["setup"]): NonNullable<CartItem["setup"]> {
  return {
    productSlug: setup?.productSlug?.trim(),
    optionCode: setup?.optionCode,
    destinationUrl: setup?.destinationUrl?.trim(),
    destinationType: setup?.destinationType?.trim(),
    platformSlug: setup?.platformSlug?.trim(),
    googlePlaceId: setup?.googlePlaceId?.trim(),
    googlePlaceName: setup?.googlePlaceName?.trim(),
    businessName: setup?.businessName?.trim(),
    headline: setup?.headline?.trim(),
    cta: setup?.cta?.trim(),
    logoFileName: setup?.logoFileName?.trim(),
    logoMediaUrl: setup?.logoMediaUrl?.trim(),
    logoStorageKey: setup?.logoStorageKey?.trim(),
    generatedQrValue: setup?.generatedQrValue?.trim(),
    frontTemplateUrl: setup?.frontTemplateUrl?.trim(),
    proofPreviewData: setup?.proofPreviewData,
    hasQr: setup?.hasQr,
    nfcOnly: setup?.nfcOnly,
    priceCents: setup?.priceCents,
    designNotes: setup?.designNotes?.trim(),
    proofApproved: setup?.proofApproved === true,
    manualCollectionAcknowledged: setup?.manualCollectionAcknowledged === true
  };
}

function isValidCheckoutSetup(option: PurchaseOption, setup: NonNullable<CartItem["setup"]>) {
  if (option.requiresDestinationUrl && !isHttpUrl(setup.destinationUrl)) {
    return false;
  }

  if (option.requiresBusinessName && !setup.businessName) {
    return false;
  }

  if (option.requiresCustomText && !setup.headline) {
    return false;
  }

  if (option.id === "branded_qr_direct") {
    if (!setup.logoMediaUrl && !setup.logoStorageKey) {
      return false;
    }

    if (!setup.generatedQrValue || !isHttpUrl(setup.generatedQrValue)) {
      return false;
    }

    if (!setup.proofPreviewData || setup.proofApproved !== true) {
      return false;
    }
  }

  return true;
}

function isHttpUrl(value: string | undefined) {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
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

export function getCheckoutSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://127.0.0.1:3000";
}
