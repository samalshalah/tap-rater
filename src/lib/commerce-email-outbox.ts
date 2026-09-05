import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";
import { decryptCommerceData, encryptCommerceData } from "@/lib/commerce-encryption";
import { sendEmail, getDefaultFromEmail, type EmailResult, type SendEmailInput } from "@/lib/email";
import { withStripeResourceLock } from "@/lib/stripe-processing";
import type { OrdersDbClient } from "@/lib/orders";

type Options = { client?: OrdersDbClient; send?: typeof sendEmail; now?: Date; sourceCreatedAt?: string };

// Keep an immutable encrypted request across provider timeouts. After the
// provider's 24-hour deduplication window, an uncertain send needs human review.
export async function sendCommerceEmail(input: SendEmailInput, options: Options = {}): Promise<EmailResult> {
  if (!options.client && !hasSupabaseAdminConfig()) return { sent: false, reason: "outbox_database_unavailable" };
  const client = options.client ?? getSupabaseAdmin();
  const id = input.delivery?.idempotencyKey;
  if (!id) return { sent: false, reason: "outbox_key_required" };
  const now = options.now ?? new Date();
  const result = await withStripeResourceLock(client, `email:${id}`, async (assertActive) => {
    const lookup = await client.from("commerce_email_outbox").select("*").eq("id", id).maybeSingle();
    if (lookup.error) return { ok: false, error: "outbox_lookup_failed" };
    let row = lookup.data;
    if (row?.status === "accepted") return { ok: true };

    // Adopt proven pre-migration sends instead of emailing historical buyers again.
    const prior = await client.from("email_deliveries").select("status,provider_message_id,created_at")
      .eq("idempotency_key", id).order("created_at", { ascending: false });
    if (prior.error) return { ok: false, error: "email_history_lookup_failed" };
    const accepted = prior.data?.some((item: any) => item.provider_message_id || ["accepted", "delivered", "delayed", "bounced", "complained"].includes(item.status));
    if (accepted) {
      const saved = await client.from("commerce_email_outbox").upsert({ id, status: "accepted", payload: null,
        entity_id: input.delivery?.entityId ?? null, first_attempt_at: null, updated_at: now.toISOString() }, { onConflict: "id" });
      return saved.error ? { ok: false, error: "email_acceptance_save_failed" } : { ok: true };
    }
    if (!row) {
      const firstKnownAttempt = prior.data?.[0]?.created_at ?? options.sourceCreatedAt;
      const historical = firstKnownAttempt && now.getTime() - Date.parse(firstKnownAttempt) >= 23 * 60 * 60 * 1000;
      const payload = { to: input.to, subject: input.subject, html: input.html,
        from: input.from ?? getDefaultFromEmail(), ...(input.replyTo ? { replyTo: input.replyTo } : {}), delivery: input.delivery };
      row = { id, status: historical ? "needs_review" : "pending", payload: encryptCommerceData(payload, id), entity_id: input.delivery?.entityId ?? null,
        first_attempt_at: null, updated_at: now.toISOString() };
      const created = await client.from("commerce_email_outbox").insert(row);
      if (created.error) return { ok: false, error: "outbox_create_failed" };
    }
    if (row.status === "needs_review" || (row.first_attempt_at && now.getTime() - Date.parse(row.first_attempt_at) >= 23 * 60 * 60 * 1000)) {
      await client.from("commerce_email_outbox").update({ status: "needs_review", updated_at: now.toISOString() }).eq("id", id);
      return { ok: false, error: "email_outcome_needs_review" };
    }
    const message = decryptCommerceData<SendEmailInput>(row.payload, id);
    await assertActive();
    const started = await client.from("commerce_email_outbox").update({ first_attempt_at: row.first_attempt_at ?? now.toISOString(),
      status: "pending", updated_at: now.toISOString() }).eq("id", id);
    if (started.error) return { ok: false, error: "email_attempt_save_failed" };
    const sent = await (options.send ?? sendEmail)(message);
    if (!sent.sent) return { ok: false, error: "commerce_email_not_accepted" };
    await assertActive();
    const saved = await client.from("commerce_email_outbox").update({ status: "accepted", payload: null, updated_at: now.toISOString() }).eq("id", id);
    return saved.error ? { ok: false, error: "email_acceptance_save_failed" } : { ok: true };
  });
  return result.ok ? { sent: true } : { sent: false, reason: result.error };
}
