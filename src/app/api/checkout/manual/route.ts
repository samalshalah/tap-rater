import { NextResponse } from "next/server";
import { z } from "zod";
import { getStripeModeSafe, validateCheckoutCart } from "@/lib/checkout";
import { hasSupabaseAdminConfig } from "@/lib/db";
import { createManualPendingOrderForCheckout } from "@/lib/orders";
import { getStorefrontProducts } from "@/lib/product-repository";
import { getCheckoutShippingAmountCents, getShippingSettings } from "@/lib/shipping-settings";
import { checkoutCartSchema } from "@/lib/validators";

const manualCheckoutSchema = checkoutCartSchema.extend({
  customer: z.object({
    email: z.string().trim().email().max(180),
    name: z.string().trim().max(160).optional()
  })
});

export async function POST(request: Request) {
  if (getStripeModeSafe() === "live") {
    return NextResponse.json({ error: "Manual checkout is disabled while live Stripe checkout is active." }, { status: 403 });
  }

  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: "Database order persistence is required before checkout can be used." }, { status: 503 });
  }

  const parsed = manualCheckoutSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Order details are invalid. Enter a valid email and review the cart." }, { status: 400 });
  }

  const [products, shippingSettings] = await Promise.all([getStorefrontProducts(), getShippingSettings()]);
  const cart = validateCheckoutCart(parsed.data.items, products);
  if (!cart.ok) {
    return NextResponse.json({ error: cart.message, reason: cart.reason }, { status: 400 });
  }

  const shippingAmountCents = getCheckoutShippingAmountCents(shippingSettings);
  const result = await createManualPendingOrderForCheckout({
    rows: cart.rows,
    subtotalCents: cart.totalCents,
    totalCents: cart.totalCents + shippingAmountCents,
    currency: cart.currency,
    customerEmail: parsed.data.customer.email,
    customerName: parsed.data.customer.name,
    shippingAmountCents,
    shippingMode: shippingSettings.shippingMode
  });

  if (!result.ok) {
    return NextResponse.json({ error: "Order could not be submitted." }, { status: 500 });
  }

  return NextResponse.json({
    checkoutMode: "manual",
    orderReference: result.orderReference,
    orderId: result.orderId
  });
}
