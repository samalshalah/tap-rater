import { NextResponse } from "next/server";
import { recordBillingInvoiceFromCheckoutSession, recordBillingInvoiceFromStripeInvoice } from "@/lib/billing-invoices";
import { getStripeClient, validateStripeWebhookConfig } from "@/lib/checkout";
import { processHostedSubscriptionLifecycleEvent } from "@/lib/hosted-subscription-lifecycle";
import { provisionHostedSubscriptionFromCheckout, provisionPaidCustomerAccountFromOrder } from "@/lib/hosted-subscription-provisioning";
import { sendPaidOrderEmails } from "@/lib/order-emails";
import { markCheckoutOrderPaymentFailure, savePaidOrderFromCheckoutSession, type StripeCheckoutSessionLike } from "@/lib/orders";

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
  let event: ReturnType<ReturnType<typeof getStripeClient>["webhooks"]["constructEvent"]>;

  try {
    event = getStripeClient().webhooks.constructEvent(payload, signature, stripeConfig.webhookSecret!);
  } catch {
    return NextResponse.json({ error: "Stripe webhook signature verification failed." }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.async_payment_failed" || event.type === "checkout.session.expired") {
      const session = event.data.object;
      const result = await markCheckoutOrderPaymentFailure(
        session.id,
        event.type === "checkout.session.expired" ? "canceled" : "failed",
        event.type === "checkout.session.expired" ? "expired" : "failed"
      );

      if (!result.ok) {
        console.warn("[stripe-webhook] checkout_failure_not_saved", {
          eventId: event.id,
          eventType: event.type,
          stripeCheckoutSessionId: session.id,
          error: result.error
        });
        return NextResponse.json({ error: "Checkout payment failure could not be saved." }, { status: 500 });
      }
    }

    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      const session = event.data.object;

      if ("payment_status" in session && session.payment_status === "paid") {
        const enrichedSession = await enrichCheckoutSessionForBilling(session);
        const result = await savePaidOrderFromCheckoutSession(enrichedSession);
        if (!result.ok) {
          return NextResponse.json({ error: "Paid order could not be saved." }, { status: 500 });
        }

        const provisioning = await provisionHostedSubscriptionFromCheckout({
          session: enrichedSession,
          order: result.order,
          eventId: event.id,
          eventType: event.type,
          siteUrl: new URL(request.url).origin
        });
        if (!provisioning.ok) {
          console.warn("[stripe-webhook] hosted_subscription_provisioning_failed", {
            stripeCheckoutSessionId: result.order.stripe_checkout_session_id,
            error: provisioning.error
          });
          return NextResponse.json({ error: "Hosted subscription could not be provisioned." }, { status: 500 });
        }

        const invoiceResult = await recordBillingInvoiceFromCheckoutSession(result.order, enrichedSession);
        if (!invoiceResult.ok) {
          console.warn("[stripe-webhook] billing_invoice_not_saved", {
            stripeCheckoutSessionId: result.order.stripe_checkout_session_id,
            error: invoiceResult.error
          });
        }

        if (!provisioning.provisioned && !result.wasAlreadyPaid) {
          const accountProvisioning = await provisionPaidCustomerAccountFromOrder({
            order: result.order,
            siteUrl: new URL(request.url).origin
          });
          if (!accountProvisioning.ok) {
            console.warn("[stripe-webhook] paid_account_provisioning_failed", {
              stripeCheckoutSessionId: result.order.stripe_checkout_session_id,
              error: accountProvisioning.error
            });
          }
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
      if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
        const invoiceResult = await recordBillingInvoiceFromStripeInvoice(event.data.object);
        if (!invoiceResult.ok) {
          console.warn("[stripe-webhook] billing_invoice_not_saved", {
            eventId: event.id,
            eventType: event.type,
            error: invoiceResult.error
          });
        }
      }

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
  } catch (error) {
    console.error("[stripe-webhook] processing_failed", {
      eventId: event.id,
      eventType: event.type,
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage: error instanceof Error ? error.message : "Unknown webhook processing error"
    });
    return NextResponse.json({ error: "Stripe webhook processing failed." }, { status: 500 });
  }
}

async function enrichCheckoutSessionForBilling(session: StripeCheckoutSessionLike): Promise<StripeCheckoutSessionLike> {
  const paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
  const invoiceId = typeof session.invoice === "string" ? session.invoice : session.invoice?.id;
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
  const stripe = getStripeClient() as any;
  let paymentMethodDetails: Record<string, unknown> | null = null;
  let receiptUrl: string | undefined;
  let invoice:
    | {
        id?: string | null;
        hosted_invoice_url?: string | null;
        invoice_pdf?: string | null;
        number?: string | null;
      }
    | undefined;
  let subscription: StripeCheckoutSessionLike["subscription"] | undefined;

  if (paymentIntentId && stripe.paymentIntents?.retrieve) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
        expand: ["payment_method", "latest_charge"]
      });
      const paymentMethod = paymentIntent?.payment_method;
      const latestCharge = paymentIntent?.latest_charge;
      paymentMethodDetails = readPaymentMethodDetails(paymentMethod);
      receiptUrl = typeof latestCharge?.receipt_url === "string" ? latestCharge.receipt_url : undefined;
    } catch (error) {
      console.warn("[stripe-webhook] payment_method_details_not_loaded", {
        paymentIntentId,
        errorName: error instanceof Error ? error.name : "UnknownError"
      });
    }
  }

  if (invoiceId && stripe.invoices?.retrieve) {
    try {
      const stripeInvoice = await stripe.invoices.retrieve(invoiceId);
      invoice = {
        id: typeof stripeInvoice?.id === "string" ? stripeInvoice.id : invoiceId,
        hosted_invoice_url: typeof stripeInvoice?.hosted_invoice_url === "string" ? stripeInvoice.hosted_invoice_url : null,
        invoice_pdf: typeof stripeInvoice?.invoice_pdf === "string" ? stripeInvoice.invoice_pdf : null,
        number: typeof stripeInvoice?.number === "string" ? stripeInvoice.number : null
      };
    } catch (error) {
      console.warn("[stripe-webhook] invoice_details_not_loaded", {
        invoiceId,
        errorName: error instanceof Error ? error.name : "UnknownError"
      });
    }
  }

  if (subscriptionId && stripe.subscriptions?.retrieve) {
    try {
      const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId);
      const firstItem = stripeSubscription?.items?.data?.[0];
      subscription = {
        id: subscriptionId,
        status: typeof stripeSubscription?.status === "string" ? stripeSubscription.status : null,
        current_period_end:
          typeof stripeSubscription?.current_period_end === "number"
            ? stripeSubscription.current_period_end
            : typeof firstItem?.current_period_end === "number"
              ? firstItem.current_period_end
              : null,
        cancel_at_period_end: Boolean(stripeSubscription?.cancel_at_period_end)
      };
    } catch (error) {
      console.warn("[stripe-webhook] subscription_details_not_loaded", {
        subscriptionId,
        errorName: error instanceof Error ? error.name : "UnknownError"
      });
    }
  }

  if (!paymentMethodDetails && !receiptUrl && !invoice && !subscription) {
    return session;
  }

  return {
    ...session,
    ...(invoice ? { invoice } : {}),
    ...(subscription ? { subscription } : {}),
    customer_details: {
      ...(session.customer_details ?? {}),
      ...(paymentMethodDetails ? { payment_method_details: paymentMethodDetails } : {}),
      ...(receiptUrl ? { receipt_url: receiptUrl } : {})
    }
  };
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
