import type Stripe from "stripe";
import { NextResponse } from "next/server";
import { recordBillingInvoiceFromCheckoutSession, recordBillingInvoiceFromStripeInvoice } from "@/lib/billing-invoices";
import { getStripeClient } from "@/lib/checkout";
import { processHostedSubscriptionLifecycleEvent } from "@/lib/hosted-subscription-lifecycle";
import { provisionHostedSubscriptionFromCheckout, provisionPaidCustomerAccountFromOrder } from "@/lib/hosted-subscription-provisioning";
import { sendPaidOrderEmails } from "@/lib/order-emails";
import { processStripeRefundEvent } from "@/lib/order-refunds";
import { withStripePaymentLock } from "@/lib/stripe-processing";
import { ensurePaidOrderProductionArtwork, markCheckoutOrderPaymentFailure, savePaidOrderFromCheckoutSession, type StripeCheckoutSessionLike } from "@/lib/orders";

export async function processStripeCommerceEvent(event: Stripe.Event, siteUrl: string) {
  try {
    if (event.type === "refund.created" || event.type === "refund.updated" || event.type === "refund.failed" || event.type === "charge.refunded") {
      const object = event.data.object;
      const paymentIntentId = typeof object.payment_intent === "string" ? object.payment_intent : object.payment_intent?.id;
      if (paymentIntentId) {
        const result = await processStripeRefundEvent({
          paymentIntentId,
          ...(event.type === "charge.refunded" ? {} : { refundId: object.id }),
        });
        if (!result.ok) return NextResponse.json({ error: "Refund status could not be synchronized." }, { status: 500 });
      }
      return NextResponse.json({ received: true });
    }
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
        const paymentIntentId = typeof enrichedSession.payment_intent === "string" ? enrichedSession.payment_intent : enrichedSession.payment_intent?.id;
        const processing = await withStripePaymentLock(`payment:${paymentIntentId ?? session.id}`, async (assertActive) => {
          const response = await (async () => {
            await assertActive();
            const result = await savePaidOrderFromCheckoutSession(enrichedSession);
            if (!result.ok) {
              return NextResponse.json({ error: "Paid order could not be saved." }, { status: 500 });
            }
            if (result.paymentReversed) {
              const invoice = await recordBillingInvoiceFromCheckoutSession(result.order, enrichedSession);
              return invoice.ok ? NextResponse.json({ received: true }) : NextResponse.json({ error: "Invoice recovery failed." }, { status: 500 });
            }

            await assertActive();
            const provisioning = await provisionHostedSubscriptionFromCheckout({
              session: enrichedSession,
              order: result.order,
              eventId: event.id,
              eventType: event.type,
              siteUrl: siteUrl
            });
            if (!provisioning.ok) {
              console.warn("[stripe-webhook] hosted_subscription_provisioning_failed", {
                stripeCheckoutSessionId: result.order.stripe_checkout_session_id,
                error: provisioning.error
              });
              return NextResponse.json({ error: "Hosted subscription could not be provisioned." }, { status: 500 });
            }

            const artwork = await ensurePaidOrderProductionArtwork(session.id, { assertActive });
            if (!artwork.ok) {
              return NextResponse.json({ error: "Production artwork could not be completed. Retry payment recovery." }, { status: 500 });
            }
            const paidOrder = artwork.order;
            const invoiceResult = await recordBillingInvoiceFromCheckoutSession(paidOrder, enrichedSession);
            if (!invoiceResult.ok) {
              console.warn("[stripe-webhook] billing_invoice_not_saved", {
                stripeCheckoutSessionId: result.order.stripe_checkout_session_id,
                error: invoiceResult.error
              });
              return NextResponse.json({ error: "Billing invoice recovery failed." }, { status: 500 });
            }

            if (artwork.paymentReversed) return NextResponse.json({ received: true });

            if (!provisioning.provisioned) {
              const accountProvisioning = await provisionPaidCustomerAccountFromOrder({
                order: paidOrder,
                siteUrl: siteUrl
              });
              if (!accountProvisioning.ok) {
                console.warn("[stripe-webhook] paid_account_provisioning_failed", {
                  stripeCheckoutSessionId: result.order.stripe_checkout_session_id,
                  error: accountProvisioning.error
                });
                return NextResponse.json({ error: "Customer account recovery failed." }, { status: 500 });
              }
            }

            {
              await assertActive();
              try {
                const emailResult = await sendPaidOrderEmails(paidOrder);
                if (!emailResult.customer.sent || !emailResult.admin.sent) {
                  console.warn("[stripe-webhook] paid_order_email_not_sent", {
                    stripeCheckoutSessionId: result.order.stripe_checkout_session_id,
                    customerReason: emailResult.customer.sent ? undefined : emailResult.customer.reason,
                    adminReason: emailResult.admin.sent ? undefined : emailResult.admin.reason
                  });
                  const needsReview = (!emailResult.customer.sent && emailResult.customer.reason === "email_outcome_needs_review") ||
                    (!emailResult.admin.sent && emailResult.admin.reason === "email_outcome_needs_review");
                  return NextResponse.json({ error: needsReview ? "Email outcome needs provider review; automatic resend is blocked." : "Order email recovery failed." }, { status: 500 });
                }
              } catch (error) {
                console.warn("[stripe-webhook] paid_order_email_failed", {
                  stripeCheckoutSessionId: result.order.stripe_checkout_session_id,
                  errorName: error instanceof Error ? error.name : "UnknownError"
                });
                return NextResponse.json({ error: "Order email recovery failed." }, { status: 500 });
              }
            }
            return NextResponse.json({ received: true });
          })();
          return { ok: response.ok, response };
        });
        return "response" in processing ? processing.response : NextResponse.json({ error: processing.error }, { status: 503 });
      }
    }

    if (
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted" ||
      event.type === "invoice.paid" ||
      event.type === "invoice.payment_failed"
    ) {
      if (event.type === "invoice.paid" || event.type === "invoice.payment_failed") {
        const currentInvoice = await getStripeClient().invoices.retrieve(event.data.object.id);
        const invoiceResult = await recordBillingInvoiceFromStripeInvoice(currentInvoice);
        if (!invoiceResult.ok) {
          console.warn("[stripe-webhook] billing_invoice_not_saved", {
            eventId: event.id,
            eventType: event.type,
            error: invoiceResult.error
          });
          return NextResponse.json({ error: "Billing invoice recovery failed." }, { status: 500 });
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
  let paymentIntentId = typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
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

  if (!paymentIntentId && subscriptionId && invoiceId) {
    const payments = await stripe.invoicePayments.list({ invoice: invoiceId, status: "paid", limit: 100 });
    const ids = [...new Set(payments.data.map((payment: { payment?: { payment_intent?: string | { id?: string } } }) => {
      const intent = payment.payment?.payment_intent;
      return typeof intent === "string" ? intent : intent?.id;
    }).filter(Boolean))];
    if (ids.length !== 1 || payments.has_more) throw new Error("Subscription checkout payment reference is not yet unambiguous. Retry the event.");
    paymentIntentId = ids[0] as string;
  }

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
      throw new Error("Payment details could not be loaded. Retry the event.");
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
      throw new Error("Invoice details could not be loaded. Retry the event.");
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

  if (!paymentMethodDetails && !receiptUrl && !invoice && !subscription && !paymentIntentId) {
    return session;
  }

  return {
    ...session,
    ...(paymentIntentId ? { payment_intent: paymentIntentId } : {}),
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
