import { buildEmailHtml, getOrderFromEmail, getOrderReplyToEmail, type EmailResult, type SendEmailInput } from "@/lib/email";
import { sendCommerceEmail } from "@/lib/commerce-email-outbox";
import { createEmailIdempotencyKey } from "@/lib/email-deliveries";
import { formatOrderReference } from "@/lib/order-reference";
import type { OrderRecord } from "@/lib/orders";

type SendEmailFn = (input: SendEmailInput) => Promise<EmailResult>;
type Skipped = { sent: false; reason: string };

/**
 * Tells the customer (and ORDER_NOTIFICATION_EMAIL) that a stand order was canceled and fully refunded.
 * Keyed by order id in the outbox, so the admin refund and Stripe's refund webhooks send it only once.
 * Email problems never fail the refund itself.
 */
export async function sendOrderRefundedEmails(
  order: OrderRecord,
  refundedCents: number,
  options: { sendEmailFn?: SendEmailFn; env?: Record<string, string | undefined> } = {}
): Promise<{ customer: EmailResult | Skipped; admin: EmailResult | Skipped }> {
  const send = options.sendEmailFn ?? ((message: SendEmailInput) => sendCommerceEmail(message));
  const env = options.env ?? process.env;
  const entityId = order.id ?? order.stripe_checkout_session_id;
  const reference = formatOrderReference(order.stripe_checkout_session_id || order.id);
  const amount = formatMoney(refundedCents, order.currency);
  const firstName = String(order.customer_name ?? "").trim().split(/\s+/)[0] ?? "";
  const items = (order.line_items_json ?? []).map((item) => `${item.quantity} x ${item.title}`);
  const site = (env.NEXT_PUBLIC_SITE_URL || "https://taprater.com").replace(/\/$/, "");
  const safe = async (input: SendEmailInput): Promise<EmailResult> => {
    try { return await send(input); } catch { return { sent: false, reason: "email_send_exception" }; }
  };

  const to = order.email?.trim();
  const customer = to
    ? await safe({
        to,
        from: getOrderFromEmail(env),
        replyTo: getOrderReplyToEmail(env),
        subject: `Your Tap Rater order ${reference} is canceled and refunded`,
        html: buildEmailHtml({
          eyebrow: "Order canceled",
          title: "Your order is canceled and refunded",
          intro: `${firstName ? `Hi ${firstName}, ` : ""}your Tap Rater order ${reference} has been canceled and ${amount} has been refunded to your original payment method.`,
          body: [
            "Refunds usually appear on your statement within 5–10 business days, depending on your bank.",
            "Your stand will not be produced or shipped.",
            "Questions? Reply to this email and we'll help."
          ],
          rows: { "Order number": reference, ...(items.length ? { Items: items.join(", ") } : {}), "Refund amount": amount }
        }),
        delivery: {
          messageType: "order_refunded_customer",
          audience: "customer",
          entityType: "order",
          entityId,
          retryable: Boolean(order.id),
          idempotencyKey: createEmailIdempotencyKey("order_refunded_customer", entityId)
        }
      })
    : { sent: false as const, reason: "missing_customer_email" };

  const adminTo = env.ORDER_NOTIFICATION_EMAIL?.trim();
  const admin = adminTo
    ? await safe({
        to: adminTo,
        from: getOrderFromEmail(env),
        ...(to ? { replyTo: to } : {}),
        subject: `Refunded: order ${reference} · ${order.customer_name || to || "customer"}`,
        html: buildEmailHtml({
          eyebrow: "Order refunded",
          title: "Order canceled and refunded",
          intro: `Order ${reference} was fully refunded (${amount}). Production and shipping are locked.`,
          rows: { "Order number": reference, Customer: order.customer_name ?? "—", Email: to ?? "—", ...(items.length ? { Items: items.join(", ") } : {}), "Refund amount": amount, "Refund ID": order.stripe_refund_id ?? "—" },
          ...(order.id ? { cta: { label: "View order", url: `${site}/admin/orders/${order.id}` } } : {})
        }),
        delivery: {
          messageType: "order_refunded_admin",
          audience: "admin",
          entityType: "order",
          entityId,
          retryable: Boolean(order.id),
          idempotencyKey: createEmailIdempotencyKey("order_refunded_admin", entityId)
        }
      })
    : { sent: false as const, reason: "missing_notification_email" };

  return { customer, admin };
}

function formatMoney(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: (currency || "usd").toUpperCase() }).format(cents / 100);
}
