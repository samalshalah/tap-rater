import { NextResponse } from "next/server";
import { getStripeClient, validateStripeWebhookConfig } from "@/lib/checkout";
import { processHostedSubscriptionLifecycleEvent } from "@/lib/hosted-subscription-lifecycle";
import { provisionHostedSubscriptionFromCheckout } from "@/lib/hosted-subscription-provisioning";
import { sendPaidOrderEmails } from "@/lib/order-emails";
import { savePaidOrderFromCheckoutSession, type StripeCheckoutSessionLike } from "@/lib/orders";

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
        const enrichedSession = await enrichCheckoutSessionForBilling(session);
        const result = await savePaidOrderFromCheckoutSession(enrichedSession);
        if (!result.ok) {
          return NextResponse.json({ error: "Paid order could not be saved." }, { status: 500 });
        }

        const provisioning = await provisionHostedSubscriptionFromCheckout({
          session,
          order: result.order,
          eventId: event.id,
          eventType: event.type
        });
        if (!provisioning.ok) {
          console.warn("[stripe-webhook] hosted_subscription_provisioning_failed", {
            stripeCheckoutSessionId: result.order.stripe_checkout_session_id,
            error: provisioning.error
          });
          return NextResponse.json({ error: "Hosted subscription could not be provisioned." }, { status: 500 });
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

    if (
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted" ||
      event.type === "invoice.paid" ||
      event.type === "invoice.payment_failed"
    ) {
      const result = await processHostedSubscriptionLifecycleEvent({
        eventId: event.id,
        eventType: event.type,
        object: event.data.object
      });
      if (!result.ok) {
        console.warn("[stripe-webhook] hosted_subscription_lifecycle_failed", {
          eventId: event.id,
          eventType: event.type,
          error: result.error
        });
        return NextResponse.json({ error: "Hosted subscription lifecycle could not be updated." }, { status: 500 });
      }
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: "Stripe webhook signature verification failed." }, { status: 400 });
  }
}

async function enrichCheckoutSessionForBilling(session: StripeCheckoutSessionLike): Promise<StripeCheckoutSessionLike> {
  const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  const stripe = getStripeClient() as any;

  if (!paymentIntentId || !stripe.paymentIntents?.retrieve) {
    return session;
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ["payment_method", "latest_charge"]
    });
    const paymentMethod = paymentIntent?.payment_method;
    const latestCharge = paymentIntent?.latest_charge;
    const paymentMethodDetails = readPaymentMethodDetails(paymentMethod);
    const receiptUrl = typeof latestCharge?.receipt_url === "string" ? latestCharge.receipt_url : undefined;

    if (!paymentMethodDetails && !receiptUrl) {
      return session;
    }

    return {
      ...session,
      customer_details: {
        ...(session.customer_details ?? {}),
        ...(paymentMethodDetails ? { payment_method_details: paymentMethodDetails } : {}),
        ...(receiptUrl ? { receipt_url: receiptUrl } : {})
      }
    };
  } catch (error) {
    console.warn("[stripe-webhook] payment_method_details_not_loaded", {
      paymentIntentId,
      errorName: error instanceof Error ? error.name : "UnknownError"
    });
    return session;
  }
}

function readPaymentMethodDetails(paymentMethod: unknown) {
  if (!paymentMethod || typeof paymentMethod !== "object") return null;
  const row = paymentMethod as Record<string, any>;
  const type = typeof row.type === "string" ? row.type : undefined;

  if (type === "card" && row.card) {
    return {
      type,
      brand: typeof row.card.brand === "string" ? row.card.brand : undefined,
      last4: typeof row.card.last4 === "string" ? row.card.last4 : undefined
    };
  }

  if (type === "paypal") {
    return {
      type,
      paypalPayerEmail: typeof row.paypal?.payer_email === "string" ? row.paypal.payer_email : undefined
    };
  }

  return type ? { type } : null;
}
