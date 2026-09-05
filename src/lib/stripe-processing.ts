import { randomUUID } from "node:crypto";
import type { OrdersDbClient } from "@/lib/orders";
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";

const leaseMs = 5 * 60 * 1000;
type Failure = { ok: false; error: string };
export type StripeProcessingGuard = () => Promise<void>;

export async function withStripePaymentLock<T extends { ok: boolean }>(key: string, work: (assertActive: StripeProcessingGuard) => Promise<T>) {
  if (!hasSupabaseAdminConfig()) return { ok: false as const, error: "Database persistence is not configured." };
  return withStripeResourceLock(getSupabaseAdmin(), key, work);
}

// Serialize work per Stripe resource across Worker instances. A crashed worker's
// lease expires; successful event receipts are written only after all work ends.
export async function withStripeResourceLock<T extends { ok: boolean }>(
  client: OrdersDbClient,
  resourceKey: string,
  work: (assertActive: StripeProcessingGuard) => Promise<T>,
  options: { now?: () => Date } = {},
): Promise<T | Failure> {
  const now = options.now ?? (() => new Date());
  const ownerToken = randomUUID();
  const current = await client.from("stripe_processing_locks").select("*").eq("resource_key", resourceKey).maybeSingle();
  if (current.error) return { ok: false, error: current.error.message };
  const expiresAt = new Date(now().getTime() + leaseMs).toISOString();
  const values = {
    resource_key: resourceKey,
    owner_token: ownerToken,
    expires_at: expiresAt,
    updated_at: now().toISOString(),
    attempts: Number(current.data?.attempts ?? 0) + 1,
    last_error: null,
  };
  if (current.data && Date.parse(current.data.expires_at) > now().getTime()) {
    return { ok: false, error: "Stripe resource is being processed. Retry this event." };
  }
  const claim = current.data
    ? await client.from("stripe_processing_locks").update(values)
      .eq("resource_key", resourceKey).eq("owner_token", current.data.owner_token)
      .eq("expires_at", current.data.expires_at).select("owner_token").maybeSingle()
    : await client.from("stripe_processing_locks").insert(values).select("owner_token").maybeSingle();
  if (claim.error || claim.data?.owner_token !== ownerToken) {
    return { ok: false, error: "Could not acquire Stripe processing lease. Retry this event." };
  }

  const assertActive = async () => {
    if (now().getTime() >= Date.parse(expiresAt)) throw new Error("Stripe processing lease expired. Retry this event.");
    const lease = await client.from("stripe_processing_locks").select("owner_token")
      .eq("resource_key", resourceKey).eq("owner_token", ownerToken).maybeSingle();
    if (lease.error || !lease.data) throw new Error("Stripe processing lease was lost. Retry this event.");
  };
  let failure: string | null = null;
  try {
    const result = await work(assertActive);
    if (!result.ok) failure = "error" in result ? String(result.error) : "Stripe processing failed.";
    return result;
  } catch (error) {
    failure = error instanceof Error ? error.message : "Stripe processing failed.";
    return { ok: false, error: failure };
  } finally {
    const released = await client.from("stripe_processing_locks").update({
      expires_at: new Date(0).toISOString(), updated_at: now().toISOString(), last_error: failure,
    }).eq("resource_key", resourceKey).eq("owner_token", ownerToken);
    if (released.error) console.warn("[stripe-processing] lease_release_failed", { resourceKey });
  }
}

export async function hasStripeReceipt(client: OrdersDbClient, receiptId: string) {
  const result = await client.from("stripe_events").select("id").eq("id", receiptId).maybeSingle();
  if (result.error) throw new Error(result.error.message);
  return Boolean(result.data);
}

export async function completeStripeReceipt(client: OrdersDbClient, receiptId: string, type: string, now = new Date()) {
  const result = await client.from("stripe_events").insert({
    id: receiptId, type, processed_at: now.toISOString(), created_at: now.toISOString(),
  });
  if (result.error) throw new Error(result.error.message);
}
