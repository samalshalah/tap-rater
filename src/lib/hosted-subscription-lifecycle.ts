import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";
import { getHostedPageStorage } from "@/lib/hosted-pages/app-storage";
import { publishHostedPageSnapshot, readCurrentHostedPageSnapshot, type HostedPageTextStorage } from "@/lib/hosted-pages/repository";
import { validateHostedPageSnapshot, type HostedPageLifecycleStatus } from "@/lib/hosted-pages/snapshots";
import type { OrdersDbClient } from "@/lib/orders";
import { getStripeClient } from "@/lib/checkout";
import { completeStripeReceipt, hasStripeReceipt, withStripeResourceLock } from "@/lib/stripe-processing";
import { randomUUID } from "node:crypto";

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
  retrieveSubscription: (id: string) => Promise<unknown>;
  isManagedSubscription?: (id: string) => Promise<boolean>;
};

type StripeSubscriptionObject = {
  id?: string | null;
  status?: string | null;
  customer?: string | { id?: string | null } | null;
  current_period_end?: number | null;
  cancel_at_period_end?: boolean | null;
  canceled_at?: number | null;
  ended_at?: number | null;
  metadata?: Record<string, string>;
  items?: { data?: Array<{ current_period_end?: number | null }> };
};

type StripeInvoiceObject = {
  subscription?: string | { id?: string | null } | null;
  parent?: {
    subscription_details?: {
      subscription?: string | { id?: string | null } | null;
    } | null;
  } | null;
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
  const subscriptionId = input.eventType.startsWith("invoice.")
    ? readInvoiceSubscriptionId(readInvoiceObject(input.object)) : readStripeId(input.object);
  if (!subscriptionId) return { ok: true, processed: false, reason: "not_hosted_subscription" };

  return withStripeResourceLock(resolved.client, `subscription:${subscriptionId}`, async (assertActive) => {
    const receiptId = `${input.eventId}:lifecycle:v2`;
    if (await hasStripeReceipt(resolved.client, receiptId)) return { ok: true as const, processed: false, reason: "duplicate_event" as const };

    // Read current state inside the resource lock. Event payloads may arrive late.
    const subscription = readSubscriptionObject(await resolved.retrieveSubscription(subscriptionId));
    if (!subscription || subscription.id !== subscriptionId || !subscription.status) {
      return { ok: false as const, error: "Stripe subscription state could not be verified." };
    }
    await assertActive();
    const lifecycleInput = deriveLifecycleUpdate(subscription, now);

    const rowResult = await resolved.client
      .from("hosted_subscriptions")
      .select("*")
      .eq("stripe_subscription_id", subscriptionId);
    if (rowResult.error) return { ok: false as const, error: rowResult.error.message };
    const rows: HostedSubscriptionRow[] = (Array.isArray(rowResult.data)
      ? rowResult.data.map((row: unknown) => normalizeHostedSubscriptionRow(row))
      : [normalizeHostedSubscriptionRow(rowResult.data)]
    ).filter((row: HostedSubscriptionRow | null): row is HostedSubscriptionRow => Boolean(row));
    if (!rows.length) {
      const managed = subscription.metadata?.tap_rater === "hosted_multilink" || await resolved.isManagedSubscription?.(subscriptionId);
      if (managed) return { ok: false as const, error: "Hosted subscription provisioning is not ready. Retry this event." };
      return { ok: true as const, processed: false, reason: "not_hosted_subscription" as const };
    }

    for (const row of rows) {
      await assertActive();
      const currentPeriodEnd = lifecycleInput.currentPeriodEnd ?? row.current_period_end ?? null;
      const pastDueSince = lifecycleInput.pastDueSince ? row.past_due_since ?? lifecycleInput.pastDueSince : null;
      const lifecycleStatus = row.lifecycle_status === "RETIRED_INTERNAL" ? row.lifecycle_status : lifecycleInput.lifecycleStatus;
      const updatePayload = {
        status: lifecycleInput.status,
        lifecycle_status: lifecycleStatus,
        current_period_end: currentPeriodEnd,
        cancel_at_period_end: lifecycleInput.cancelAtPeriodEnd,
        past_due_since: pastDueSince,
        grace_ends_at: pastDueSince ? addDays(new Date(pastDueSince), hostedSubscriptionGracePeriodDays).toISOString() : null,
        updated_at: now.toISOString()
      };

      const subscriptionUpdate = await resolved.client.from("hosted_subscriptions").update(updatePayload).eq("id", row.id);
      if (subscriptionUpdate.error) return { ok: false as const, error: subscriptionUpdate.error.message };

      await assertActive();
      const pageUpdate = await resolved.client
        .from("hosted_page_editor_pages")
        .update({
          lifecycle_status: lifecycleStatus,
          updated_at: now.toISOString()
        })
        .eq("id", row.hosted_page_id)
        .eq("code", row.permanent_code);
      if (pageUpdate.error) return { ok: false as const, error: pageUpdate.error.message };

      if (resolved.storage) {
        await assertActive();
        await republishLifecycleSnapshot(resolved.storage, row.permanent_code, lifecycleStatus, {
          paidThrough: currentPeriodEnd,
          pastDueSince
        });
      }
    }

    await assertActive();
    await completeStripeReceipt(resolved.client, receiptId, input.eventType, now);
    return {
      ok: true as const,
      processed: true,
      code: rows[0].permanent_code,
      lifecycleStatus: lifecycleInput.lifecycleStatus
    };
  });
}

function deriveLifecycleUpdate(subscription: StripeSubscriptionObject, now: Date) {
  const currentPeriodEnd = readCurrentPeriodEnd(subscription);
  const isDeleted = subscription.status === "canceled" || subscription.status === "incomplete_expired";
  const lifecycleStatus = isDeleted ? "EXPIRED" : mapSubscriptionLifecycle(subscription);
  const isPastDue = lifecycleStatus === "PAST_DUE";
  const pastDueSince = isPastDue ? now.toISOString() : null;

  return {
    subscriptionId: readStripeId(subscription),
    status: isDeleted ? "canceled" : readSubscriptionStatus(subscription),
    lifecycleStatus,
    currentPeriodEnd,
    cancelAtPeriodEnd: Boolean(subscription?.cancel_at_period_end) && !isDeleted,
    pastDueSince
  };
}

export function mapSubscriptionLifecycle(subscription: unknown): HostedPageLifecycleStatus {
  const value = readSubscriptionObject(subscription);
  if (value?.status === "canceled" || value?.status === "incomplete_expired") return "EXPIRED";
  if (value?.status === "past_due" || value?.status === "unpaid" || value?.status === "incomplete" || value?.status === "paused") return "PAST_DUE";
  if (value?.cancel_at_period_end) return "CANCELLED_AT_PERIOD_END";
  if (value?.status === "active" || value?.status === "trialing") return "ACTIVE";
  return "PAST_DUE";
}

async function republishLifecycleSnapshot(
  storage: HostedPageTextStorage,
  code: string,
  lifecycleStatus: HostedPageLifecycleStatus,
  timing: { paidThrough?: string | null; pastDueSince?: string | null }
) {
  const current = await readCurrentHostedPageSnapshot(storage, code);
  if (!current) throw new Error("Hosted page snapshot is missing. Retry after provisioning is repaired.");

  const publishedAt = new Date().toISOString();
  await publishHostedPageSnapshot(storage, validateHostedPageSnapshot({
    ...current,
    lifecycleStatus,
    subscriptionPaidThrough: timing.paidThrough ?? undefined,
    subscriptionPastDueSince: timing.pastDueSince ?? undefined,
    version: `lifecycle-${Date.now()}-${randomUUID()}`,
    publishedAt
  }));
}

async function resolveDependencies(dependencies?: HostedSubscriptionLifecycleDependencies) {
  if (dependencies) return { ok: true as const, ...dependencies };
  if (!hasSupabaseAdminConfig()) return { ok: false as const, error: "Database persistence is not configured." };
  const storage = await getHostedPageStorage();
  if (!storage) return { ok: false as const, error: "Hosted snapshot storage is not configured." };
  return {
    ok: true as const, client: getSupabaseAdmin() as OrdersDbClient, storage,
    retrieveSubscription: (id: string) => getStripeClient().subscriptions.retrieve(id),
    isManagedSubscription: async (id: string) => {
      const sessions = await getStripeClient().checkout.sessions.list({ subscription: id, limit: 100 });
      return sessions.data.some((session) => session.metadata?.checkout_intent === "hosted_subscription");
    },
  };
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

function readInvoiceSubscriptionId(invoice: StripeInvoiceObject | null) {
  return readStripeId(invoice?.subscription) ?? readStripeId(invoice?.parent?.subscription_details?.subscription);
}

function readStripeId(value: unknown) {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (value && typeof value === "object" && "id" in value) return readString((value as { id?: unknown }).id);
  return undefined;
}

function readSubscriptionStatus(value: unknown) {
  const status = readSubscriptionObject(value)?.status;
  if (status === "paused") return "unpaid";
  if (status === "incomplete_expired") return "canceled";
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
  const subscription = readSubscriptionObject(value);
  const periods = subscription?.items?.data?.map((item) => item.current_period_end).filter((value): value is number => typeof value === "number" && Number.isFinite(value)) ?? [];
  const epochSeconds = subscription?.current_period_end ?? (periods.length ? Math.min(...periods) : null);
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
