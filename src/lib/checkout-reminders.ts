import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { analyticsSql } from "@/lib/storefront-analytics-server";
import { getSupabaseAdmin } from "@/lib/db";
import { getStripeClient, getStripeMode } from "@/lib/checkout";
import { getAdminOrderById, type OrderRecord } from "@/lib/orders";
import { withStripeResourceLock } from "@/lib/stripe-processing";
import { sendCommerceEmail } from "@/lib/commerce-email-outbox";
import { getOrderFromEmail, getCustomerReplyToEmail } from "@/lib/email";
import { getEmailTemplate } from "@/lib/email-templates";
import { renderCustomerOrderEmail } from "@/lib/customer-order-email-layout";
import { defaultReminderSettings, reminderSettingsSchema, unpaidRecoverable, personalInvitation, reminderCopy, type ReminderSettings } from "@/lib/checkout-reminder-model";
const origin = "https://taprater.com";
const hour = 3600000;
const emailHash = (email: string) => createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
export function signRecoveryToken(orderId: string, expires: number, secret = process.env.ADMIN_SESSION_SECRET) {
  if (!secret) throw new Error("Recovery links are unavailable.");
  const body = `${orderId}.${expires}`;
  return `${body}.${createHmac("sha256", secret).update(`checkout-recovery:${body}`).digest("base64url")}`;
}
export function verifyRecoveryToken(token: string, secret = process.env.ADMIN_SESSION_SECRET, now = Date.now()) {
  const parts = token.split(".");
  if (parts.length !== 3 || !/^[a-f0-9-]{36}$/i.test(parts[0]) || !/^\d{13}$/.test(parts[1]) || !/^[A-Za-z0-9_-]{43}$/.test(parts[2]) || !secret || Number(parts[1]) < now) return null;
  const expected = signRecoveryToken(parts[0], Number(parts[1]), secret);
  return token.length === expected.length && timingSafeEqual(Buffer.from(token), Buffer.from(expected)) ? parts[0] : null;
}
export async function getReminderSettings(): Promise<ReminderSettings> {
  const rows = await analyticsSql().query("SELECT payload FROM site_content WHERE key='checkout_reminders'", []);
  return rows[0] ? reminderSettingsSchema.parse(rows[0].payload) : defaultReminderSettings;
}
export async function saveReminderSettings(value: ReminderSettings) {
  const parsed = reminderSettingsSchema.parse(value);
  await analyticsSql().query("INSERT INTO site_content(key,type,status,payload,updated_at) VALUES('checkout_reminders','section','published',$1::jsonb,now()) ON CONFLICT(key) DO UPDATE SET payload=excluded.payload,updated_at=now()", [JSON.stringify(parsed)]);
}
export async function enrollCheckoutReminder(sessionId: string, consent: boolean, internal: boolean) {
  if (!consent || internal || !sessionId.startsWith("cs_live_")) return;
  await analyticsSql().query(`INSERT INTO checkout_reminders(order_id,consent_at)
    SELECT id,now() FROM orders WHERE stripe_checkout_session_id=$1
    ON CONFLICT(order_id) DO NOTHING`, [sessionId]);
}
export async function loadReminderOrder(id: string) {
  const { order } = await getAdminOrderById(id);
  if (!order) throw new Error("Order not found.");
  return order;
}
export async function reminderState(id: string) {
  const rows = await analyticsSql().query("SELECT * FROM checkout_reminders WHERE order_id=$1", [id]);
  return rows[0];
}
export async function ensureReminderState(id: string) {
  await analyticsSql().query("INSERT INTO checkout_reminders(order_id) VALUES($1) ON CONFLICT(order_id) DO NOTHING", [id]);
  return reminderState(id);
}
export async function recoveryEmailSuppressed(order: OrderRecord) {
  const rows = await analyticsSql().query(`SELECT 1 FROM checkout_reminder_suppressions WHERE email_hash=$1
    UNION ALL SELECT 1 FROM email_deliveries WHERE lower(recipient)=lower($2) AND status IN ('bounced','complained','suppressed') LIMIT 1`, [emailHash(order.email || ""), order.email || ""]);
  return !!rows.length;
}
export async function assertRecoveryUnpaid(order: OrderRecord, legacyApproved = false) {
  if (order.customer_details_json?.recovery_original_order_id) throw new Error("Use the original order’s payment invitation to avoid duplicate checkouts.");
  if (!unpaidRecoverable(order)) throw new Error("This order is not eligible for a payment invitation.");
  const sql = analyticsSql();
  // Suppress a repeated checkout when the same customer has already paid since it started.
  const paid = await sql.query(`SELECT 1 FROM orders WHERE lower(email)=lower($1)
    AND (status='paid' OR payment_status IN ('paid','refunded','partially_refunded','refund_pending'))
    AND created_at >= $2::timestamptz AND stripe_checkout_session_id LIKE 'cs_live_%' LIMIT 1`, [order.email, order.created_at]);
  if (paid.length) throw new Error("A paid order already exists for this customer. Review it before requesting payment.");
  const sourceLive = order.stripe_checkout_session_id.startsWith("cs_live_");
  if (!sourceLive && !legacyApproved) throw new Error("A legacy/test order requires a reviewed live payment invitation.");
  if (getStripeMode() !== "live") throw new Error("Live payment recovery is not configured.");
  const related = await sql.query("SELECT session_id FROM checkout_recovery_sessions WHERE order_id=$1", [order.id]);
  const ids = [...new Set([...(sourceLive ? [order.stripe_checkout_session_id] : []), ...related.map(r => r.session_id as string)])];
  const stripe = getStripeClient();
  const sessions = [];
  for (const id of ids) {
    const session = await stripe.checkout.sessions.retrieve(id, { expand: ["payment_intent"] });
    if (!session.livemode || session.payment_status !== "unpaid" || session.status === "complete" ||
      (session.payment_intent && (typeof session.payment_intent === "string" || !["requires_payment_method", "canceled"].includes(session.payment_intent.status)))) {
      throw new Error("Payment is already completed or in progress. No reminder or new payment session is allowed.");
    }
    sessions.push(session);
  }
  return sessions;
}
export async function buildReminderEmail(order: OrderRecord, copy: { subject: string; message: string }, options: { token?: string; test?: boolean } = {}) {
  const state = options.token ? undefined : await reminderState(order.id!);
  const token = options.token ?? signRecoveryToken(order.id!, Date.parse(state!.token_expires_at));
  const template = await getEmailTemplate("customer-order-confirmation");
  const url = options.test ? `${origin}/support` : `${origin}/checkout/recover?token=${encodeURIComponent(token)}`;
  const unsubscribeUrl = options.test ? undefined : `${origin}/checkout/recover?token=${encodeURIComponent(token)}&unsubscribe=1`;
  return renderCustomerOrderEmail(order, { ...template, introText: copy.message }, {}, false,
    { subject: copy.subject, paymentUrl: url, unsubscribeUrl });
}
export async function sendReminder(id: string, copy: { subject: string; message: string }, key: string, stage?: number) {
  const order = await loadReminderOrder(id);
  const state = await reminderState(id);
  if (!state || state.paused || Date.parse(state.token_expires_at) < Date.now() || await recoveryEmailSuppressed(order)) throw new Error("Reminders are paused, expired, or unsubscribed for this customer.");
  await assertRecoveryUnpaid(order, state.legacy_approved);
  const { buildRecoverySessionParams } = await import("@/lib/checkout-recovery-payment");
  buildRecoverySessionParams(order, "validation");
  const sent = await sendCommerceEmail({ to: order.email!, from: getOrderFromEmail(), replyTo: getCustomerReplyToEmail(), subject: copy.subject,
    html: await buildReminderEmail(order, copy), delivery: { audience: "customer", messageType: stage ? `checkout_reminder_${stage}` : "personal_payment_invitation", entityType: "order", entityId: id, retryable: false, idempotencyKey: key } });
  if (!sent.sent) throw new Error(sent.reason);
  return sent;
}
export async function runCheckoutReminders() {
  const settings = await getReminderSettings();
  if (!settings.enabled) return { enabled: false, sent: 0 };
  const candidates = await analyticsSql().query(`SELECT r.order_id,r.last_activity_at,r.created_at FROM checkout_reminders r
    JOIN orders o ON o.id=r.order_id
    WHERE r.consent_at IS NOT NULL AND NOT r.paused AND NOT r.completed AND r.token_expires_at>now()
    AND o.stripe_checkout_session_id LIKE 'cs_live_%'
    AND (o.status='pending_payment' OR (o.status='canceled' AND o.payment_status='expired'))
    AND r.last_activity_at < now()-($1 * interval '1 hour')
    AND r.created_at > now()-interval '7 days'
    AND NOT EXISTS(SELECT 1 FROM storefront_analytics_checkouts c WHERE c.stripe_session_id=o.stripe_checkout_session_id AND c.excluded)
    AND NOT EXISTS(SELECT 1 FROM orders newer WHERE lower(newer.email)=lower(o.email) AND newer.created_at>o.created_at AND newer.stripe_checkout_session_id LIKE 'cs_live_%' AND newer.customer_details_json->>'recovery_original_order_id' IS NULL)
    ORDER BY r.last_checked_at NULLS FIRST,r.last_activity_at LIMIT 25`, [settings.firstHours]);
  let sent = 0;
  for (const candidate of candidates) {
    try {
      const elapsed = (Date.now() - Date.parse(candidate.last_activity_at)) / hour;
      const stages = [settings.firstHours, settings.secondHours, ...(settings.thirdEnabled ? [settings.thirdHours] : [])];
      const history = await analyticsSql().query("SELECT message_type,status,created_at FROM email_deliveries WHERE entity_id=$1 AND message_type LIKE 'checkout_reminder_%' ORDER BY created_at DESC", [candidate.order_id]);
      if (history[0] && Date.now() - Date.parse(history[0].created_at) < hour * 12) continue;
      const stage = stages.findIndex((hours, i) => elapsed >= hours && !history.some(h => h.message_type === `checkout_reminder_${i + 1}` && ["accepted", "delivered", "delayed"].includes(h.status)));
      if (stage < 0) continue;
      await sendReminder(candidate.order_id, reminderCopy(stage + 1), `checkout-reminder/${candidate.order_id}/${stage + 1}`, stage + 1);
      if (stage === stages.length - 1) await analyticsSql().query("UPDATE checkout_reminders SET completed=true WHERE order_id=$1", [candidate.order_id]);
      sent++;
    } catch (error) {
      await analyticsSql().query("UPDATE checkout_reminders SET last_error=$2 WHERE order_id=$1", [candidate.order_id, error instanceof Error ? error.message.slice(0, 200) : "Reminder unavailable"]);
    } finally {
      await analyticsSql().query("UPDATE checkout_reminders SET last_checked_at=now() WHERE order_id=$1", [candidate.order_id]);
    }
  }
  return { enabled: true, sent };
}
// A link preview is read-only. Only an explicit customer POST can expire an old
// checkout and create a replacement, serialized by the original order.
export async function startRecoveryPayment(id: string) {
  return withStripeResourceLock(getSupabaseAdmin(), `checkout-recovery:${id}`, async (assertActive) => {
    const order = await loadReminderOrder(id);
    const state = await reminderState(id);
    if (!state || Date.parse(state.token_expires_at) < Date.now()) throw new Error("This payment link has expired. Contact support for a new invitation.");
    const sessions = await assertRecoveryUnpaid(order, state.legacy_approved);
    const stripe = getStripeClient();
    const active = sessions.find(s => s.id === state.active_session_id && s.status === "open" && s.url);
    if (active) return { ok: true as const, url: active.url! };
    for (const session of sessions) if (session.status === "open") await stripe.checkout.sessions.expire(session.id);
    await assertActive();
    // Do not reuse an unknown request after Stripe's 24-hour idempotency window.
    if (state.attempt_key && !state.active_session_id && Date.now() - Date.parse(state.attempt_at) > 23 * hour) throw new Error("Payment setup needs a support review before another attempt.");
    const attempt = state.attempt_key && !state.active_session_id ? state.attempt_key : randomUUID();
    await analyticsSql().query("UPDATE checkout_reminders SET attempt_key=$2,attempt_at=CASE WHEN attempt_key=$2 THEN attempt_at ELSE now() END,active_session_id=NULL,last_activity_at=now() WHERE order_id=$1", [id, attempt]);
    const { buildRecoverySessionParams } = await import("@/lib/checkout-recovery-payment");
    const session = await stripe.checkout.sessions.create(buildRecoverySessionParams(order, signRecoveryToken(id, Date.parse(state.token_expires_at))), { idempotencyKey: `order-recovery/${id}/${attempt}` });
    if (!session.url || session.amount_total !== order.total_cents || !session.livemode) throw new Error("The payment total could not be verified. Please contact support.");
    await assertActive();
    // Clone the full saved production data before exposing a payable session.
    // Existing fulfillment continues to use its normal paid-webhook pipeline.
    const copy = { ...order, id: randomUUID(), stripe_checkout_session_id: session.id, stripe_payment_intent_id: null,
      status: "pending_payment", payment_status: "unpaid", refunded_amount_cents: 0, refund_pending_amount_cents: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      customer_details_json: { ...order.customer_details_json, recovery_original_order_id: id },
      line_items_json: order.line_items_json.map(item => ({ ...item, setup: { ...item.setup, recoveryOriginalSession: order.stripe_checkout_session_id } })) };
    const sql = analyticsSql();
    await sql.transaction([
      sql.query(`INSERT INTO orders SELECT (jsonb_populate_record(NULL::orders,$1::jsonb)).* ON CONFLICT(stripe_checkout_session_id) DO NOTHING`, [JSON.stringify(copy)]),
      sql.query("INSERT INTO checkout_recovery_sessions(session_id,order_id) VALUES($1,$2) ON CONFLICT DO NOTHING", [session.id, id]),
      sql.query("UPDATE checkout_reminders SET active_session_id=$2,last_error=NULL WHERE order_id=$1", [id, session.id]),
      sql.query(`INSERT INTO storefront_analytics_checkouts(stripe_session_id,session_id,excluded,consent,ga_client_id,ga_session_id,ga_status)
        SELECT $1,session_id,excluded,consent,ga_client_id,ga_session_id,'pending' FROM storefront_analytics_checkouts WHERE stripe_session_id=$2 ON CONFLICT DO NOTHING`, [session.id, order.stripe_checkout_session_id]),
      sql.query(`INSERT INTO storefront_analytics_checkouts(stripe_session_id,excluded,consent,ga_status) VALUES($1,false,false,'pending') ON CONFLICT DO NOTHING`, [session.id]),
    ]);
    return { ok: true as const, url: session.url };
  });
}
export { emailHash, personalInvitation };
