import Stripe from "stripe";
import { getDefaultShippingSettings, type ShippingSettingsInput } from "@/lib/shipping-settings";
import { resolveCheckoutShippingRule } from "@/lib/shipping-rules";
import { getCheckoutTaxableAmountCents, getCheckoutTaxAmountCents } from "@/lib/tax-rules";
import { getDefaultTaxSettings, type TaxSettingsInput } from "@/lib/tax-settings";
import type { CheckoutCustomerInput, CheckoutShippingAddressInput } from "@/lib/validators";
import type { CheckoutCartRow, ValidatedCheckoutCart } from "@/lib/checkout";

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

export function buildStripeCheckoutLineItems(rows: CheckoutCartRow[], shippingAmountCents = 0, taxAmountCents = 0, taxLabel = "Sales tax"): Stripe.Checkout.SessionCreateParams.LineItem[] {
  const productLineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = rows.flatMap((row) => {
    const productData = {
      name: row.title,
      description: `${row.optionLabel} - ${row.shortDescription}${row.offerLabel ? ` — ${row.offerLabel} applied` : ""}`,
      metadata: {
        product_id: row.productId,
        option_id: row.optionId,
        sku: row.sku
      }
    };
    const lowUnit = Math.floor(row.lineSubtotalCents / row.quantity);
    const remainder = row.lineSubtotalCents % row.quantity;
    const physicalLine: Stripe.Checkout.SessionCreateParams.LineItem = {
      quantity: row.quantity,
      price_data: {
        currency: "usd",
        product_data: productData,
        unit_amount: lowUnit
      }
    };

    const physicalLines = remainder === 0 ? [physicalLine] : [
      ...(row.quantity > remainder ? [{ ...physicalLine, quantity: row.quantity - remainder }] : []),
      { ...physicalLine, quantity: remainder, price_data: { ...physicalLine.price_data!, unit_amount: lowUnit + 1 } },
    ];
    if (row.destinationMode !== "HOSTED") {
      return physicalLines;
    }

    const hostedLine: Stripe.Checkout.SessionCreateParams.LineItem = {
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
          interval: "month" as const
        },
        unit_amount: row.monthlyAmountCents ?? 0
      }
    };

    return [...physicalLines, hostedLine];
  });

  const adjustmentLineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

  if (shippingAmountCents > 0) {
    adjustmentLineItems.push({
      quantity: 1,
      price_data: {
        currency: "usd",
        product_data: {
          name: "Standard shipping",
          description: "Shipping for this Tap Rater order.",
          metadata: {
            line_kind: "shipping"
          }
        },
        unit_amount: shippingAmountCents
      }
    });
  }

  if (taxAmountCents > 0) {
    adjustmentLineItems.push({
      quantity: 1,
      price_data: {
        currency: "usd",
        product_data: {
          name: taxLabel,
          description: "Manual sales tax collected by Tap Rater.",
          metadata: {
            line_kind: "manual_tax"
          }
        },
        unit_amount: taxAmountCents
      }
    });
  }

  return [...productLineItems, ...adjustmentLineItems];
}

export function createCheckoutSessionParams({
  cart,
  customer,
  shippingAddress,
  siteUrl,
  stripeCustomerId,
  stripeMode = getStripeMode(),
  shippingSettings = getDefaultShippingSettings(),
  taxSettings = getDefaultTaxSettings()
}: {
  cart: Extract<ValidatedCheckoutCart, { ok: true }>;
  customer?: CheckoutCustomerInput;
  shippingAddress?: CheckoutShippingAddressInput;
  siteUrl: string;
  stripeCustomerId?: string | null;
  stripeMode?: StripeMode;
  shippingSettings?: ShippingSettingsInput;
  taxSettings?: TaxSettingsInput;
}): Stripe.Checkout.SessionCreateParams {
  const normalizedSiteUrl = siteUrl.replace(/\/+$/, "");
  const shippingRule = resolveCheckoutShippingRule(cart.totalCents, shippingSettings);
  const taxAmountCents = getCheckoutTaxAmountCents(
    taxSettings,
    getCheckoutTaxableAmountCents({
      recurringTotalCents: cart.recurringTotalCents,
      shippingState: shippingAddress?.state,
      shippingAmountCents: shippingRule.amountCents,
      standTotalCents: cart.totalCents,
      taxSettings
    })
  );
  const dueTodayCents = cart.totalCents + cart.recurringTotalCents + shippingRule.amountCents + taxAmountCents;
  const requiresAccount = customer?.createAccount === true || cart.checkoutMode === "subscription";

  return {
    mode: cart.checkoutMode,
    ui_mode: "elements",
    integration_identifier: createStripeIntegrationIdentifier(),
    line_items: buildStripeCheckoutLineItems(cart.rows, shippingRule.amountCents, taxAmountCents, taxSettings.taxLabel),
    return_url: `${normalizedSiteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    ...(stripeCustomerId ? { customer: stripeCustomerId } : customer?.email ? { customer_email: customer.email } : {}),
    billing_address_collection: "auto",
    ...(cart.checkoutMode === "payment" ? {
      ...(stripeCustomerId ? {} : { customer_creation: "always" as const }),
      invoice_creation: {
        enabled: true
      }
    } : {}),
    phone_number_collection: {
      enabled: Boolean(customer?.phone?.trim())
    },
    ...(cart.checkoutMode === "subscription" ? { subscription_data: { metadata: { tap_rater: "hosted_multilink" } } } : {}),
    metadata: {
      stripe_mode: stripeMode,
      total_cents: String(cart.totalCents),
      recurring_total_cents: String(cart.recurringTotalCents),
      due_today_cents: String(dueTodayCents),
      configured_items: String(cart.rows.length),
      checkout_intent: cart.checkoutMode === "subscription" ? "hosted_subscription" : "direct_payment",
      shipping_mode: shippingRule.mode,
      shipping_amount_cents: String(shippingRule.amountCents),
      tax_mode: taxSettings.taxMode,
      tax_label: taxSettings.taxLabel,
      tax_rate_bps: String(taxSettings.manualTaxRateBps),
      tax_amount_cents: String(taxAmountCents),
      tax_recurring: taxSettings.taxRecurring ? "true" : "false",
      tax_shipping: taxSettings.taxShipping ? "true" : "false",
      customer_email: customer?.email ?? "",
      customer_name: customer?.name ?? "",
      customer_phone: customer?.phone ?? shippingAddress?.phone ?? "",
      create_account: requiresAccount ? "true" : "false",
      shipping_country: shippingAddress?.country ?? "US",
      shipping_state: shippingAddress?.state ?? "",
      shipping_postal_code: shippingAddress?.postalCode ?? ""
    }
  };
}

function createStripeIntegrationIdentifier() {
  return `taprater_checkout_${crypto.randomUUID().replaceAll("-", "").slice(0, 8)}`;
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
  const publishableKey = getStripePublishableKey(env);
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
    timeout: 30_000,
    maxNetworkRetries: 0
  });
}

export function getCheckoutSiteUrl(requestOrigin?: string | null) {
  if (requestOrigin && /^https?:\/\//i.test(requestOrigin)) {
    return requestOrigin;
  }

  return process.env.NEXT_PUBLIC_SITE_URL || "http://127.0.0.1:3000";
}

export function getStripePublishableKey(env: NodeJS.ProcessEnv = process.env) {
  return env.STRIPE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
}
