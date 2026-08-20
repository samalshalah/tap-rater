import { NextResponse } from "next/server";
import { getStripeClient, validateStripeWebhookConfig } from "@/lib/checkout";
import { sendPaidOrderEmails } from "@/lib/order-emails";
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

        if (!result.wasAlreadyPaid) {
          try {
            const emailResult = await sendPaidOrderEmails(result.order);
            if (!emailResult.customer.sent || !emailResult.admin.sent) {
              console.warn("[stripe-webhook] paid_order_email_not_sent", {
                stripeCheckoutSessionId: result.order.stripe_checkout_session_id,
                customerReason: emailResult.customer.sent ? undefined : emailResult.customer.reason,
                adminReason: emailResult.admin.sent ? undefined : emailResult.admin.reason
              });
            }
          } catch (error) {
            console.warn("[stripe-webhook] paid_order_email_failed", {
              stripeCheckoutSessionId: result.order.stripe_checkout_session_id,
              errorName: error instanceof Error ? error.name : "UnknownError"
            });
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: "Stripe webhook signature verification failed." }, { status: 400 });
  }
}
