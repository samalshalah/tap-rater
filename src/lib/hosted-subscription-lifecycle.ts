import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";
import { getHostedPageStorage } from "@/lib/hosted-pages/app-storage";
import { publishHostedPageSnapshot, readCurrentHostedPageSnapshot, type HostedPageTextStorage } from "@/lib/hosted-pages/repository";
import { validateHostedPageSnapshot, type HostedPageLifecycleStatus } from "@/lib/hosted-pages/snapshots";
import type { OrdersDbClient } from "@/lib/orders";

export const hostedSubscriptionGracePeriodDays = 7;

export type HostedSubscriptionLifecycleEventType =
  | "customer.subscription.updated"
  | "customer.subscription.deleted"
  | "invoice.paid"
  | "invoice.payment_failed";

export type HostedSubscriptionLifecycleEventInput = {
  eventId: string;
  eventType: HostedSubscriptionLifecycleEventType;
  object: unknown;
  now?: Date;
};

export type HostedSubscriptionLifecycleResult =
  | { ok: true; processed: boolean; reason?: "duplicate_event" | "not_hosted_subscription"; code?: string; lifecycleStatus?: HostedPageLifecycleStatus }
  | { ok: false; error: string };

export type HostedSubscriptionLifecycleDependencies = {
  client: OrdersDbClient;
  storage?: HostedPageTextStorage;
};

type StripeSubscriptionObject = {
  id?: string | null;
  status?: string | null;
  customer?: string | { id?: string | null } | null;
  current_period_end?: number | null;
  cancel_at_period_end?: boolean | null;
  canceled_at?: number | null;
  ended_at?: number | null;
};

type StripeInvoiceObject = {
  subscription?: string | { id?: string | null } | null;
  customer?: string | { id?: string | null } | null;
};

type HostedSubscriptionRow = {
  id: string;
  customer_id: string;
  business_id: string;
  hosted_page_id: string;
  stripe_subscription_id: string;
  permanent_code: string;
  hosted_page_url: string;
  lifecycle_status: HostedPageLifecycleStatus;
  status?: string | null;
  current_period_end?: string | null;
  past_due_since?: string | null;
};

export async function processHostedSubscriptionLifecycleEvent(
  input: HostedSubscriptionLifecycleEventInput,
  dependencies?: HostedSubscriptionLifecycleDependencies
): Promise<HostedSubscriptionLifecycleResult> {
  const resolved = await resolveDependencies(dependencies);
  if (!resolved.ok) return resolved;

  const now = input.now ?? new Date();
  const recorded = await recordStripeEventIfNew(resolved.client, input.eventId, input.eventType, now);
  if (!recorded.ok) return recorded;
  if (!recorded.created) return { ok: true, processed: false, reason: "duplicate_event" };

  const lifecycleInput = deriveLifecycleUpdate(input.eventType, input.object, now);
  if (!lifecycleInput.subscriptionId) return { ok: true, processed: false, reason: "not_hosted_subscription" };

  const rowResult = await resolved.client
    .from("hosted_subscriptions")
    .select("*")
    .eq("stripe_subscription_id", lifecycleInput.subscriptionId);
  if (rowResult.error) return { ok: false, error: rowResult.error.message };
  const rows: HostedSubscriptionRow[] = (Array.isArray(rowResult.data)
    ? rowResult.data.map((row: unknown) => normalizeHostedSubscriptionRow(row))
    : [normalizeHostedSubscriptionRow(rowResult.data)]
  ).filter((row: HostedSubscriptionRow | null): row is HostedSubscriptionRow => Boolean(row));
  if (!rows.length) return { ok: true, processed: false, reason: "not_hosted_subscription" };

  for (const row of rows) {
    const currentPeriodEnd = lifecycleInput.currentPeriodEnd ?? (input.eventType.startsWith("invoice.") ? row.current_period_end ?? null : null);
    const updatePayload = {
      status: lifecycleInput.status,
      lifecycle_status: lifecycleInput.lifecycleStatus,
      current_period_end: currentPeriodEnd,
      cancel_at_period_end: lifecycleInput.cancelAtPeriodEnd,
      past_due_since: lifecycleInput.pastDueSince,
      grace_ends_at: lifecycleInput.graceEndsAt,
      updated_at: now.toISOString()
    };

    const subscriptionUpdate = await resolved.client.from("hosted_subscriptions").update(updatePayload).eq("id", row.id);
    if (subscriptionUpdate.error) return { ok: false, error: subscriptionUpdate.error.message };

    const pageUpdate = await resolved.client
      .from("hosted_page_editor_pages")
      .update({
        lifecycle_status: lifecycleInput.lifecycleStatus,
        updated_at: now.toISOString()
      })
      .eq("id", row.hosted_page_id)
      .eq("code", row.permanent_code);
    if (pageUpdate.error) return { ok: false, error: pageUpdate.error.message };

    if (resolved.storage) {
      await republishLifecycleSnapshot(resolved.storage, row.permanent_code, lifecycleInput.lifecycleStatus, {
        paidThrough: currentPeriodEnd,
        pastDueSince: lifecycleInput.pastDueSince
      });
    }
  }

  return {
    ok: true,
    processed: true,
    code: rows[0].permanent_code,
    lifecycleStatus: lifecycleInput.lifecycleStatus
  };
}

function deriveLifecycleUpdate(type: HostedSubscriptionLifecycleEventType, object: unknown, now: Date) {
  if (type === "invoice.paid") {
    const invoice = readInvoiceObject(object);
    return {
      subscriptionId: readStripeId(invoice?.subscription),
      status: "active",
      lifecycleStatus: "ACTIVE" as HostedPageLifecycleStatus,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      pastDueSince: null,
      graceEndsAt: null
    };
  }

  if (type === "invoice.payment_failed") {
    const invoice = readInvoiceObject(object);
    const pastDueSince = now.toISOString();
    return {
      subscriptionId: readStripeId(invoice?.subscription),
      status: "past_due",
      lifecycleStatus: "PAST_DUE" as HostedPageLifecycleStatus,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      pastDueSince,
      graceEndsAt: addDays(now, hostedSubscriptionGracePeriodDays).toISOString()
    };
  }

  const subscription = readSubscriptionObject(object);
  const currentPeriodEnd = readCurrentPeriodEnd(subscription);
  const isDeleted = type === "customer.subscription.deleted";
  const lifecycleStatus = isDeleted ? "EXPIRED" : mapSubscriptionLifecycle(subscription);
  const isHealthy = lifecycleStatus === "ACTIVE" || lifecycleStatus === "REACTIVATED" || lifecycleStatus === "CANCELLED_AT_PERIOD_END";
  const isPastDue = lifecycleStatus === "PAST_DUE";
  const pastDueSince = isPastDue ? now.toISOString() : null;

  return {
    subscriptionId: readStripeId(subscription),
    status: isDeleted ? "canceled" : readSubscriptionStatus(subscription),
    lifecycleStatus,
    currentPeriodEnd,
    cancelAtPeriodEnd: Boolean(subscription?.cancel_at_period_end) && !isDeleted,
    pastDueSince,
    graceEndsAt: isPastDue ? addDays(now, hostedSubscriptionGracePeriodDays).toISOString() : null,
    clearPastDue: isHealthy
  };
}

export function mapSubscriptionLifecycle(subscription: unknown): HostedPageLifecycleStatus {
  const value = readSubscriptionObject(subscription);
  if (value?.status === "canceled") return "EXPIRED";
  if (value?.status === "past_due" || value?.status === "unpaid" || value?.status === "incomplete") return "PAST_DUE";
  if (value?.cancel_at_period_end) return "CANCELLED_AT_PERIOD_END";
  if (value?.status === "active" || value?.status === "trialing") return "ACTIVE";
  return "ACTIVE";
}

async function republishLifecycleSnapshot(
  storage: HostedPageTextStorage,
  code: string,
  lifecycleStatus: HostedPageLifecycleStatus,
  timing: { paidThrough?: string | null; pastDueSince?: string | null }
) {
  const current = await readCurrentHostedPageSnapshot(storage, code);
  if (!current) return;

  const publishedAt = new Date().toISOString();
  await publishHostedPageSnapshot(storage, validateHostedPageSnapshot({
    ...current,
    lifecycleStatus,
    subscriptionPaidThrough: timing.paidThrough ?? undefined,
    subscriptionPastDueSince: timing.pastDueSince ?? undefined,
    version: `${current.version}-lifecycle-${Date.now()}`,
    publishedAt
  }));
}

async function resolveDependencies(dependencies?: HostedSubscriptionLifecycleDependencies) {
  if (dependencies) return { ok: true as const, ...dependencies };
  if (!hasSupabaseAdminConfig()) return { ok: false as const, error: "Database persistence is not configured." };
  return { ok: true as const, client: getSupabaseAdmin() as OrdersDbClient, storage: await getHostedPageStorage() };
}

async function recordStripeEventIfNew(client: OrdersDbClient, eventId: string, eventType: string, now: Date) {
  const existing = await client.from("stripe_events").select("id").eq("id", eventId).maybeSingle();
  if (existing.error) return { ok: false as const, error: existing.error.message };
  if (existing.data) return { ok: true as const, created: false };

  const inserted = await client.from("stripe_events").insert({
    id: eventId,
    type: eventType,
    processed_at: now.toISOString(),
    created_at: now.toISOString()
  });
  if (inserted.error) return { ok: false as const, error: inserted.error.message };
  return { ok: true as const, created: true };
}

function normalizeHostedSubscriptionRow(row: unknown): HostedSubscriptionRow | null {
  const value = readRecord(row);
  const id = readString(value.id);
  const customerId = readString(value.customer_id);
  const businessId = readString(value.business_id);
  const hostedPageId = readString(value.hosted_page_id);
  const stripeSubscriptionId = readString(value.stripe_subscription_id);
  const permanentCode = readString(value.permanent_code);
  const hostedPageUrl = readString(value.hosted_page_url);
  if (!id || !customerId || !businessId || !hostedPageId || !stripeSubscriptionId || !permanentCode || !hostedPageUrl) return null;

  return {
    id,
    customer_id: customerId,
    business_id: businessId,
    hosted_page_id: hostedPageId,
    stripe_subscription_id: stripeSubscriptionId,
    permanent_code: permanentCode,
    hosted_page_url: hostedPageUrl,
    lifecycle_status: readLifecycleStatus(value.lifecycle_status),
    status: readString(value.status),
    current_period_end: readString(value.current_period_end),
    past_due_since: readString(value.past_due_since)
  };
}

function readSubscriptionObject(value: unknown): StripeSubscriptionObject | null {
  return value && typeof value === "object" ? (value as StripeSubscriptionObject) : null;
}

function readInvoiceObject(value: unknown): StripeInvoiceObject | null {
  return value && typeof value === "object" ? (value as StripeInvoiceObject) : null;
}

function readStripeId(value: unknown) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value && typeof value === "object" && "id" in value) return readString((value as { id?: unknown }).id);
  return undefined;
}

function readSubscriptionStatus(value: unknown) {
  const status = readSubscriptionObject(value)?.status;
  return status === "active" ||
    status === "past_due" ||
    status === "canceled" ||
    status === "unpaid" ||
    status === "incomplete" ||
    status === "trialing"
    ? status
    : "unknown";
}

function readCurrentPeriodEnd(value: unknown) {
  const epochSeconds = readSubscriptionObject(value)?.current_period_end;
  return typeof epochSeconds === "number" && Number.isFinite(epochSeconds) ? new Date(epochSeconds * 1000).toISOString() : null;
}

function readLifecycleStatus(value: unknown): HostedPageLifecycleStatus {
  return value === "PAST_DUE" || value === "CANCELLED_AT_PERIOD_END" || value === "EXPIRED" || value === "REACTIVATED" || value === "RETIRED_INTERNAL"
    ? value
    : "ACTIVE";
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}
