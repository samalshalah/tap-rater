import { NextResponse } from "next/server";
import type { MigratedProduct } from "@/data/migrated-products";
import {
  STRIPE_CHECKOUT_TIMEOUT_MS,
  createCheckoutSessionParams,
  getCheckoutSiteUrl,
  getStripeClient,
  isCheckoutTimeoutError,
  validateCheckoutCart,
  validateStripeRuntimeConfig,
  withTimeout,
  type CheckoutCartRow,
  type ValidatedCheckoutCart
} from "@/lib/checkout";
import { hasSupabaseAdminConfig } from "@/lib/db";
import { createPendingOrderForCheckout } from "@/lib/orders";
import { getStorefrontProducts } from "@/lib/product-repository";
import { getCheckoutShippingAmountCents, getShippingSettings, type ShippingSettingsInput } from "@/lib/shipping-settings";
import { checkoutCartSchema } from "@/lib/validators";

type CheckoutRouteLogger = Pick<Console, "error" | "info" | "warn">;

type StripeCheckoutSessionResult = {
  id?: string | null;
  url?: string | null;
};

type PendingOrderResult = Awaited<ReturnType<typeof createPendingOrderForCheckout>>;

export type CheckoutRouteDependencies = {
  createPendingOrder: (input: {
    stripeCheckoutSessionId: string;
    rows: CheckoutCartRow[];
    subtotalCents: number;
    totalCents: number;
    currency: string;
    shippingAmountCents?: number;
    shippingMode?: "manual" | "free" | "flat";
  }) => Promise<PendingOrderResult>;
  createRequestId: () => string;
  createStripeSession: (input: {
    cart: Extract<ValidatedCheckoutCart, { ok: true }>;
    siteUrl: string;
    stripeMode: "test" | "live";
    shippingSettings: ShippingSettingsInput;
  }) => Promise<StripeCheckoutSessionResult>;
  getProducts: () => Promise<MigratedProduct[]>;
  getShippingSettings: () => Promise<ShippingSettingsInput>;
  getSiteUrl: (requestOrigin?: string | null) => string;
  hasOrderPersistence: () => boolean;
  logger: CheckoutRouteLogger;
  orderTimeoutMs: number;
  stripeTimeoutMs: number;
};

export async function handleCheckoutPost(request: Request, dependencies: CheckoutRouteDependencies = checkoutRouteDependencies) {
  const requestId = dependencies.createRequestId();
  const parsed = checkoutCartSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    logCheckout(dependencies.logger, "warn", requestId, "invalid_payload");
    return NextResponse.json({ error: "Cart payload is invalid." }, { status: 400 });
  }

  logCheckout(dependencies.logger, "info", requestId, "parsed_cart", {
    itemCount: parsed.data.items.length,
    items: parsed.data.items.map((item) => ({
      productId: item.productId,
      optionId: item.optionId ?? "standard_direct",
      quantity: item.quantity
    }))
  });
  logCheckout(dependencies.logger, "info", requestId, "stripe_key_check", {
    mode: process.env.STRIPE_MODE || "test",
    secretKeyPrefix: getSafeStripeKeyPrefix(process.env.STRIPE_SECRET_KEY),
    publishableKeyPrefix: getSafeStripeKeyPrefix(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY),
    hasWebhookSecret: Boolean(process.env.STRIPE_WEBHOOK_SECRET)
  });

  const stripeConfig = validateStripeRuntimeConfig();

  if (!stripeConfig.ok) {
    logCheckout(dependencies.logger, "warn", requestId, "stripe_config_invalid", {
      mode: stripeConfig.mode
    });
    return NextResponse.json({ error: stripeConfig.error }, { status: 503 });
  }

  if (!dependencies.hasOrderPersistence()) {
    logCheckout(dependencies.logger, "warn", requestId, "order_persistence_missing");
    return NextResponse.json({ error: "Database order persistence is required before checkout can be used." }, { status: 503 });
  }

  const products = await dependencies.getProducts();
  const shippingSettings = await dependencies.getShippingSettings();
  logCheckout(dependencies.logger, "info", requestId, "products_loaded", { count: products.length });
  const cart = validateCheckoutCart(parsed.data.items, products);

  if (!cart.ok) {
    logCheckout(dependencies.logger, "warn", requestId, "cart_validation_failed", { reason: cart.reason });
    return NextResponse.json({ error: cart.message, reason: cart.reason }, { status: 400 });
  }

  logCheckout(dependencies.logger, "info", requestId, "cart_validated", {
    itemCount: cart.rows.length,
    totalCents: cart.totalCents
  });

  try {
    logCheckout(dependencies.logger, "info", requestId, "stripe_session_create_start");
    const requestOrigin = new URL(request.url).origin;
    const session = await withTimeout(
      dependencies.createStripeSession({
        cart,
        siteUrl: dependencies.getSiteUrl(requestOrigin),
        stripeMode: stripeConfig.mode,
        shippingSettings
      }),
      dependencies.stripeTimeoutMs,
      "Stripe Checkout Session creation"
    );
    logCheckout(dependencies.logger, "info", requestId, "stripe_session_create_success", {
      sessionIdPrefix: session.id?.slice(0, 8) ?? "missing",
      hasUrl: Boolean(session.url)
    });

    if (!session.id || !session.url) {
      logCheckout(dependencies.logger, "error", requestId, "stripe_session_missing_fields", {
        hasId: Boolean(session.id),
        hasUrl: Boolean(session.url)
      });
      return NextResponse.json({ error: "Stripe Checkout Session could not be created." }, { status: 500 });
    }

    logCheckout(dependencies.logger, "info", requestId, "pending_order_create_start");
    const pendingOrder = await withTimeout(
      dependencies.createPendingOrder({
        stripeCheckoutSessionId: session.id,
        rows: cart.rows,
        subtotalCents: cart.totalCents,
        totalCents: cart.totalCents + getCheckoutShippingAmountCents(shippingSettings),
        currency: cart.currency,
        shippingAmountCents: getCheckoutShippingAmountCents(shippingSettings),
        shippingMode: shippingSettings.shippingMode
      }),
      dependencies.orderTimeoutMs,
      "Pending order creation"
    );

    if (!pendingOrder.ok) {
      logCheckout(dependencies.logger, "error", requestId, "pending_order_create_failed", {
        error: pendingOrder.error
      });
      return NextResponse.json({ error: "Order could not be prepared for checkout." }, { status: 500 });
    }

    logCheckout(dependencies.logger, "info", requestId, "pending_order_create_success");
    return NextResponse.json({ url: session.url });
  } catch (error) {
    if (isCheckoutTimeoutError(error)) {
      logCheckout(dependencies.logger, "error", requestId, "checkout_timeout", {
        label: error.label,
        timeoutMs: error.timeoutMs
      });
      return NextResponse.json({ error: "Stripe Checkout timed out. Please try again." }, { status: 504 });
    }

    logCheckout(dependencies.logger, "error", requestId, "checkout_unhandled_error", {
      errorName: error instanceof Error ? error.name : "UnknownError"
    });
    return NextResponse.json({ error: "Stripe Checkout could not be started." }, { status: 500 });
  }
}

const checkoutRouteDependencies: CheckoutRouteDependencies = {
  createPendingOrder: createPendingOrderForCheckout,
  createRequestId: createCheckoutRequestId,
  createStripeSession: async ({ cart, siteUrl, stripeMode, shippingSettings }) => {
    const stripe = getStripeClient();
    return stripe.checkout.sessions.create(
      createCheckoutSessionParams({
        cart,
        siteUrl,
        stripeMode,
        shippingSettings
      })
    );
  },
  getProducts: getStorefrontProducts,
  getShippingSettings,
  getSiteUrl: getCheckoutSiteUrl,
  hasOrderPersistence: hasSupabaseAdminConfig,
  logger: console,
  orderTimeoutMs: STRIPE_CHECKOUT_TIMEOUT_MS,
  stripeTimeoutMs: STRIPE_CHECKOUT_TIMEOUT_MS
};

function createCheckoutRequestId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `checkout_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }
}

function logCheckout(
  logger: CheckoutRouteLogger,
  level: keyof CheckoutRouteLogger,
  requestId: string,
  stage: string,
  details: Record<string, unknown> = {}
) {
  logger[level]("[checkout]", {
    requestId,
    stage,
    ...details
  });
}

function getSafeStripeKeyPrefix(value: string | undefined) {
  if (value?.startsWith("sk_test_")) return "sk_test_";
  if (value?.startsWith("sk_live_")) return "sk_live_";
  if (value?.startsWith("pk_test_")) return "pk_test_";
  if (value?.startsWith("pk_live_")) return "pk_live_";
  return "missing_or_invalid";
}
