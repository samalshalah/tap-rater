import Stripe from "stripe";
import type { MigratedProduct } from "@/data/migrated-products";
import type { CartItem } from "@/lib/cart";
import { getPurchaseOptionForProduct, type PurchaseOption, type PurchaseOptionId } from "@/lib/purchase-options";

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
  logoStatus: "not_required" | "manual_collection_required";
  logoReference?: string | null;
  proofRequired: boolean;
  proofApproved: boolean;
  productionStatus: "ready_for_direct_activation" | "pending_manual_logo_and_proof" | "pending_manual_design_and_proof";
};

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

    if (!Number.isInteger(item.quantity) || item.quantity <= 0 || !product) {
      continue;
    }

    // The option is always derived from the actual product, never trusted
    // from client input -- see the identical fix and rationale in
    // src/lib/cart.ts. A stored optionId that doesn't match its product
    // (e.g. through tampering) can no longer cause the wrong price or
    // requirements to be applied at checkout.
    const option = getPurchaseOptionForProduct(product);

    const setup = normalizeCheckoutSetup(item.setup);

    if (!isValidCheckoutSetup(option, setup)) {
      continue;
    }

    const logoRequired = option.requiresLogo;
    const proofRequired = option.requiresFinalProof;
    const proofApproved = proofRequired ? false : setup.proofApproved === true;
    // Derived from requiresManualCollection (which already correctly covers
    // all 4 pricing tiers via the product's own activationType) rather than
    // checking each option.id explicitly -- the previous version only
    // checked for "custom_direct"/"branded_qr_direct" and would have
    // silently fallen through to "ready_for_direct_activation" for Hosted
    // Multi-Link Stand, which also needs manual logo/proof collection.
    const productionStatus = !option.requiresManualCollection
      ? "ready_for_direct_activation"
      : option.id === "custom_direct"
        ? "pending_manual_design_and_proof"
        : "pending_manual_logo_and_proof";

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
      logoStatus: logoRequired ? "manual_collection_required" : "not_required",
      logoReference: null,
      proofRequired,
      proofApproved,
      productionStatus
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

// Maps a pricing tier to its Stripe Price ID env var name. When that env
// var is set (a real Price ID created in the Stripe dashboard -- see
// docs/stripe-price-ids.md), checkout uses it directly. When it's not set
// (the current default, since Stripe hasn't gone live yet), checkout falls
// back to price_data (computed inline from the product's own price) --
// exactly the existing behavior, unchanged. This is the actual "prepare
// the system so Stripe price IDs can be added at the final step" --
// setting the env var later requires no code change.
//
// Hosted Multi-Link's subscription price ID
// (STRIPE_PRICE_HOSTED_MULTI_LINK_SUBSCRIPTION) is intentionally NOT wired
// here: a checkout session mixing a one-time setup fee with a recurring
// subscription line item needs mode: "subscription" and different Checkout
// Session construction than the current one-time "payment" mode flow. That
// is real, separate work for the final Stripe stage, not something to bolt
// on silently here -- see docs/stripe-price-ids.md for the plan.
function getStripePriceIdForOption(optionId: PurchaseOptionId): string | undefined {
  const envVarByOptionId: Record<PurchaseOptionId, string | undefined> = {
    standard_direct: process.env.STRIPE_PRICE_STANDARD_DIRECT_3900,
    branded_qr_direct: process.env.STRIPE_PRICE_BRANDED_QR_DIRECT_4900,
    custom_direct: process.env.STRIPE_PRICE_CUSTOM_DIRECT_4900,
    hosted_multi_link: process.env.STRIPE_PRICE_HOSTED_MULTI_LINK_SETUP
  };

  const value = envVarByOptionId[optionId];
  return value && value.trim() ? value.trim() : undefined;
}

export function buildStripeCheckoutLineItems(rows: CheckoutCartRow[]): Stripe.Checkout.SessionCreateParams.LineItem[] {
  return rows.map((row) => {
    const priceId = getStripePriceIdForOption(row.optionId);

    if (priceId) {
      return { quantity: row.quantity, price: priceId };
    }

    return {
      quantity: row.quantity,
      price_data: {
        currency: "usd",
        product_data: {
          name: row.title,
          description: row.shortDescription,
          metadata: {
            product_id: row.productId,
            option_id: row.optionId,
            sku: row.sku
          }
        },
        unit_amount: row.unitAmountCents
      }
    };
  });
}

export function createCheckoutSessionParams({
  cart,
  siteUrl
}: {
  cart: Extract<ValidatedCheckoutCart, { ok: true }>;
  siteUrl: string;
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
      test_mode_only: "true",
      total_cents: String(cart.totalCents),
      configured_items: String(cart.rows.length)
    }
  };
}

function normalizeCheckoutSetup(setup: CartItem["setup"]): NonNullable<CartItem["setup"]> {
  return {
    destinationUrl: setup?.destinationUrl?.trim(),
    businessName: setup?.businessName?.trim(),
    headline: setup?.headline?.trim(),
    cta: setup?.cta?.trim(),
    designNotes: setup?.designNotes?.trim(),
    proofApproved: setup?.proofApproved === true,
    manualCollectionAcknowledged: setup?.manualCollectionAcknowledged === true
  };
}

function isValidCheckoutSetup(option: PurchaseOption, setup: NonNullable<CartItem["setup"]>) {
  if (!isHttpUrl(setup.destinationUrl)) {
    return false;
  }

  if (option.requiresBusinessName && !setup.businessName) {
    return false;
  }

  if (option.requiresCustomText && !setup.headline) {
    return false;
  }

  // Every tier requires exactly one of these two confirmations: the ones
  // needing manual logo/design collection (branded, hosted, custom) need
  // manualCollectionAcknowledged; the direct, no-collection tier
  // (standard) needs proofApproved instead. Deriving this from the
  // option's own requiresManualCollection flag (rather than checking each
  // optionId string) means every current AND future pricing tier is
  // covered automatically -- this is exactly the gap that let Hosted
  // Multi-Link Stand skip both checks entirely before this fix.
  if (option.requiresManualCollection && !setup.manualCollectionAcknowledged) {
    return false;
  }

  if (!option.requiresManualCollection && setup.proofApproved !== true) {
    return false;
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

export function getStripeSecretKey() {
  const key = process.env.STRIPE_SECRET_KEY;

  if (!isStripeTestSecretKey(key)) {
    throw new Error("Stripe test mode is not configured. Use a sk_test_ key only.");
  }

  return key!;
}

export function getStripeClient() {
  return new Stripe(getStripeSecretKey());
}

export function getCheckoutSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "http://127.0.0.1:3000";
}
