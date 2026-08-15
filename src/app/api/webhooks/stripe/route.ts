import { NextResponse } from "next/server";
import { getStripeClient, validateStripeWebhookConfig } from "@/lib/checkout";
import { savePaidOrderFromCheckoutSession } from "@/lib/orders";

export async function POST(request: Request) {
  const stripeConfig = validateStripeWebhookConfig();
  const signature = request.headers.get("stripe-signature");

  if (!stripeConfig.ok) {
    return NextResponse.json({ error: stripeConfig.error }, { status: 503 });
  }

  if (!signature) {
    return NextResponse.json({ error: "Stripe signature is missing." }, { status: 400 });
  }

  const payload = await request.text();

  try {
    const event = getStripeClient().webhooks.constructEvent(payload, signature, stripeConfig.webhookSecret!);

    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object;

      if ("payment_status" in session && session.payment_status === "paid") {
        const result = await savePaidOrderFromCheckoutSession(session);
        if (!result.ok) {
          return NextResponse.json({ error: "Paid order could not be saved." }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: "Stripe webhook signature verification failed." }, { status: 400 });
  }
}
