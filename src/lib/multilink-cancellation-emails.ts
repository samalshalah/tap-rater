import { buildEmailHtml, getDefaultFromEmail, getOrderFromEmail, getOrderReplyToEmail, type EmailResult, type SendEmailInput } from "./email";
import { sendCommerceEmail } from "./commerce-email-outbox";
import { liveDb } from "./google-business/live-reviews";

type Sql = ReturnType<typeof liveDb>;
type SendFn = (input: SendEmailInput) => Promise<EmailResult>;

/** canceled: renewal stopped, page live until the end date. resumed: that was undone. ended: the subscription is over today. */
export type MultiLinkSubscriptionChange = "canceled" | "resumed" | "ended";

export type MultiLinkChangeInput = {
  change: MultiLinkSubscriptionChange;
  hostedSubscriptionId: string;
  stripeSubscriptionId: string;
  code: string;
  pageUrl: string;
  end: string | null;
  eventId: string;
};

const subjects: Record<MultiLinkSubscriptionChange, { customer: string; admin: string }> = {
  canceled: { customer: "Your Multi-Link subscription is canceled", admin: "Canceled" },
  resumed: { customer: "Your Multi-Link subscription will renew", admin: "Kept" },
  ended: { customer: "Your Multi-Link page has ended", admin: "Ended" },
};

/**
 * Emails the customer and ORDER_NOTIFICATION_EMAIL when a Multi-Link subscription is cancelled, kept or ends.
 * Keyed by the Stripe event (or our own action id), so retries never send twice; the lifecycle sync only calls
 * this when the saved state actually changes, so the later webhook for the same change sends nothing.
 */
export async function notifyMultiLinkSubscriptionChange(input: MultiLinkChangeInput, { sql = liveDb(), send = sendCommerceEmail, env = process.env }: { sql?: Sql; send?: SendFn; env?: Record<string, string | undefined> } = {}) {
  const [customer] = await sql`SELECT c.email,c.name,c.first_name,b.business_name FROM hosted_subscriptions s
    JOIN customers c ON c.id=s.customer_id LEFT JOIN businesses b ON b.id=s.business_id WHERE s.id=${input.hostedSubscriptionId}::uuid`;
  if (!customer?.email) return [];
  const email = String(customer.email), name = String(customer.name || email);
  const firstName = String(customer.first_name || "").trim();
  const business = String(customer.business_name || "").trim();
  const page = business ? `${business} Multi-Link page` : "Multi-Link page";
  const site = (env.NEXT_PUBLIC_SITE_URL || "https://taprater.com").replace(/\/$/, "");
  const endDate = input.end ? new Date(input.end).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }) : "the end of your paid month";
  const hi = firstName ? `Hi ${firstName}, ` : "";
  const { change } = input;

  const client = buildEmailHtml({
    eyebrow: "Multi-Link",
    title: change === "canceled" ? "Your subscription is canceled" : change === "resumed" ? "Your subscription will renew" : "Your Multi-Link page has ended",
    intro: change === "canceled"
      ? `${hi}your ${page} stays active until ${endDate}. It will not renew and you won't be charged again.`
      : change === "resumed"
        ? `${hi}your ${page} will keep renewing as usual.`
        : `${hi}your ${page} subscription has ended, so the page is no longer active.`,
    body: change === "canceled"
      ? [`Your stand's QR code and NFC keep opening your page until ${endDate}. After that they show a "not active" page.`, 'Changed your mind? Choose "Keep my subscription" under Licence & billing on your Multi-Link page before that date.', "Have a billing question? Reply to this email."]
      : change === "resumed"
        ? [input.end ? `Your next renewal is on ${endDate}.` : "Your next renewal is at the end of your current month."]
        : ['Scanning or tapping your stand now shows a "not active" page.', "Want it back? Reply to this email and we'll help."],
    cta: { label: "Open Multi-Link", url: `${site}/account/multilink` },
  });
  const delivery = (audience: "customer" | "admin") => ({
    messageType: `multilink_${change}_${audience}`, audience, entityType: "hosted_subscription", entityId: input.hostedSubscriptionId,
    retryable: true, idempotencyKey: `multilink_${change}_${audience}:${input.eventId}`,
  });
  const results: EmailResult[] = [];
  results.push(await send({ to: email, from: getDefaultFromEmail(env), replyTo: getOrderReplyToEmail(env), subject: subjects[change].customer, html: client, delivery: delivery("customer") }));

  const to = env.ORDER_NOTIFICATION_EMAIL?.trim();
  if (to) {
    const admin = buildEmailHtml({
      eyebrow: "Subscription change",
      title: change === "canceled" ? "Multi-Link subscription canceled" : change === "resumed" ? "Multi-Link cancellation undone" : "Multi-Link subscription ended",
      intro: change === "canceled" ? `${name} canceled Multi-Link. The page stays live until ${endDate}.`
        : change === "resumed" ? `${name} chose to keep Multi-Link.` : `${name}'s Multi-Link subscription has ended. The page is no longer active.`,
      rows: { Customer: name, Email: email, Business: business || "—", Page: input.pageUrl, "Ends / renews": change === "ended" ? "Ended" : endDate, "Stripe subscription": input.stripeSubscriptionId },
      cta: { label: "View subscriptions", url: `${site}/admin/subscriptions#multi-link` },
    });
    results.push(await send({ to, from: getOrderFromEmail(env), replyTo: email, subject: `${subjects[change].admin}: Multi-Link · ${business || name} (${input.code})`, html: admin, delivery: delivery("admin") }));
  }
  return results;
}
