import Stripe from "stripe";
import type { MigratedProduct } from "@/data/migrated-products";
import type { CartItem } from "@/lib/cart";
import { getProductPurchaseOptions, getPurchaseOption, type PurchaseOptionId } from "@/lib/purchase-options";

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
    const option = item.optionId ? getPurchaseOption(item.optionId) : undefined;

    if (!Number.isInteger(item.quantity) || item.quantity <= 0 || !product || !option) {
      continue;
    }

    if (!getProductPurchaseOptions(product).some((purchaseOption) => purchaseOption.id === option.id)) {
      continue;
    }

    const setup = normalizeCheckoutSetup(item.setup);

    if (!isValidCheckoutSetup(option.id, setup)) {
      continue;
    }

    const logoRequired = option.requiresLogo;
    const proofRequired = option.requiresFinalProof;
    const proofApproved = proofRequired ? false : setup.proofApproved === true;
    const productionStatus =
      option.id === "custom_direct"
        ? "pending_manual_design_and_proof"
        : option.id === "branded_qr_direct"
          ? "pending_manual_logo_and_proof"
          : "ready_for_direct_activation";

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

function isValidCheckoutSetup(optionId: PurchaseOptionId, setup: NonNullable<CartItem["setup"]>) {
  if (!isHttpUrl(setup.destinationUrl)) {
    return false;
  }

  if ((optionId === "branded_qr_direct" || optionId === "custom_direct") && !setup.businessName) {
    return false;
  }

  if (optionId === "custom_direct" && !setup.headline) {
    return false;
  }

  if (optionId === "standard_direct" && setup.proofApproved !== true) {
    return false;
  }

  if ((optionId === "branded_qr_direct" || optionId === "custom_direct") && setup.manualCollectionAcknowledged !== true) {
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
