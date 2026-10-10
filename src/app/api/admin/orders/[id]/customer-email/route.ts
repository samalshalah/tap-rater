import { createHash } from "node:crypto";
import { z } from "zod";
import { requireAdminApi } from "@/lib/admin-auth";
import { analyticsSql } from "@/lib/storefront-analytics-server";
import { loadReminderOrder, reminderState, ensureReminderState, buildReminderEmail, sendReminder, personalInvitation, assertRecoveryUnpaid } from "@/lib/checkout-reminders";
import { reminderDraftSchema, reminderCopy } from "@/lib/checkout-reminder-model";
import { sendEmail, getOrderFromEmail, getCustomerReplyToEmail } from "@/lib/email";

type Context = { params: Promise<{ id: string }> };
const inputSchema = reminderDraftSchema.extend({ action: z.enum(["preview", "save", "test", "send", "pause", "resume"]), reviewed: z.boolean().default(false) });
export async function GET(_request: Request, context: Context) {
  const unauthorized = await requireAdminApi(); if (unauthorized) return unauthorized;
  const { id } = await context.params;
  const order = await loadReminderOrder(id), state = await reminderState(id);
  const history = await analyticsSql().query("SELECT subject,status,created_at,message_type FROM email_deliveries WHERE entity_id=$1 AND message_type IN ('personal_payment_invitation','checkout_reminder_1','checkout_reminder_2','checkout_reminder_3','payment_invitation_test') ORDER BY created_at DESC LIMIT 20", [id]);
  const related = await analyticsSql().query("SELECT o.id,o.status,o.payment_status FROM checkout_recovery_sessions s JOIN orders o ON o.stripe_checkout_session_id=s.session_id WHERE s.order_id=$1 ORDER BY s.created_at DESC", [id]);
  return Response.json({ email: order.email, state, history, related,
    draft: state?.draft_subject ? { subject: state.draft_subject, message: state.draft_message } : personalInvitation(order), reminder: reminderCopy(1),
    legacy: !order.stripe_checkout_session_id.startsWith("cs_live_"), testRecipient: process.env.ADMIN_EMAIL || null });
}
export async function POST(request: Request, context: Context) {
  const unauthorized = await requireAdminApi(); if (unauthorized) return unauthorized;
  const { id } = await context.params;
  const parsed = inputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Enter a subject and message." }, { status: 400 });
  const input = parsed.data;
  try {
    const order = await loadReminderOrder(id);
    const state = await ensureReminderState(id);
    if (input.action === "pause" || input.action === "resume") {
      await analyticsSql().query("UPDATE checkout_reminders SET paused=$2 WHERE order_id=$1", [id, input.action === "pause"]);
      return Response.json({ ok: true });
    }
    if (input.action === "preview") return Response.json({ html: await buildReminderEmail(order, input, { test: true }) });
    if (input.action === "test") {
      if (!process.env.ADMIN_EMAIL) throw new Error("An administrator test recipient is not configured.");
      const result = await sendEmail({ to: process.env.ADMIN_EMAIL, from: getOrderFromEmail(), replyTo: getCustomerReplyToEmail(), subject: `[PREVIEW] ${input.subject}`,
        html: await buildReminderEmail(order, input, { test: true }), delivery: { messageType: "payment_invitation_test", audience: "admin", entityType: "order", entityId: id, retryable: false } });
      if (!result.sent) throw new Error(result.reason);
      return Response.json({ ok: true });
    }
    // Saving copy does not authorize conversion of an old test-mode checkout.
    if (input.action === "save") {
      await analyticsSql().query("UPDATE checkout_reminders SET draft_subject=$2,draft_message=$3 WHERE order_id=$1", [id, input.subject, input.message]);
      return Response.json({ ok: true });
    }
    if (!input.reviewed) throw new Error("Review the customer, artwork, saved total, and any previous payments before sending.");
    const legacy = !order.stripe_checkout_session_id.startsWith("cs_live_");
    if (legacy && !input.legacyApproved) throw new Error("Confirm this is a real customer order before inviting live payment.");
    const { buildRecoverySessionParams } = await import("@/lib/checkout-recovery-payment");
    buildRecoverySessionParams(order, "preview"); // Validate saved totals/address before an email is sent.
    await assertRecoveryUnpaid(order, legacy && input.legacyApproved);
    await analyticsSql().query("UPDATE checkout_reminders SET draft_subject=$2,draft_message=$3,legacy_approved=$4 WHERE order_id=$1", [id, input.subject, input.message, legacy && input.legacyApproved]);
    if (Date.parse(state.token_expires_at) < Date.now()) await analyticsSql().query("UPDATE checkout_reminders SET token_expires_at=now()+interval '30 days' WHERE order_id=$1", [id]);
    const currentState = await reminderState(id);
    const key = createHash("sha256").update(`${input.subject}\n${input.message}\n${currentState.token_expires_at}`).digest("hex");
    await sendReminder(id, input, `personal-invitation/${id}/${key}`);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Email could not be prepared." }, { status: 409 });
  }
}
