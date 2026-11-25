import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";
import { getHostedPageStorage } from "@/lib/hosted-pages/app-storage";
import { publishHostedPageSnapshot, readCurrentHostedPageSnapshot, type HostedPageTextStorage } from "@/lib/hosted-pages/repository";
import { validateHostedPageSnapshot, type HostedPageLifecycleStatus } from "@/lib/hosted-pages/snapshots";
import type { OrdersDbClient } from "@/lib/orders";
import { getStripeClient } from "@/lib/checkout";
import { completeStripeReceipt, hasStripeReceipt, withStripeResourceLock } from "@/lib/stripe-processing";
import { randomUUID } from "node:crypto";
import { notifyMultiLinkSubscriptionChange, type MultiLinkChangeInput, type MultiLinkSubscriptionChange } from "@/lib/multilink-cancellation-emails";

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
  /** Emails the customer and admin when renewal is cancelled, kept or the subscription ends. */
  notify?: (input: MultiLinkChangeInput) => Promise<unknown>;
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
  items?: { data?: Array<{ id?: string; current_period_end?: number | null; price?: { product?: string | { id?: string; metadata?: Record<string, string> | null } | null } | null }> };
};

/**
 * One checkout can create several Multi-Link pages on one subscription, one monthly charge each
 * (tagged order_line). A page cancelled on its own has its charge removed and a note on the
 * subscription: tr_line_<n>_end = "period_end:<product>" (live until its paid-through date) or
 * "now:<product>" (ended today). The product lets "keep" put the charge back.
 */
export type EndedHostedLine = { mode: "period_end" | "now"; productId: string };

export function endedLineKey(line: string) {
  return `tr_line_${line}_end`;
}

export function readEndedHostedLines(metadata: Record<string, string> | null | undefined): Record<string, EndedHostedLine> {
  const result: Record<string, EndedHostedLine> = {};
  for (const [key, value] of Object.entries(metadata ?? {})) {
    const line = key.match(/^tr_line_(\d{1,3})_end$/)?.[1];
    const [mode, productId] = value.split(":");
    if (line && (mode === "period_end" || mode === "now") && productId) result[line] = { mode, productId };
  }
  return result;
}

/** The monthly Multi-Link charges on a subscription, with the order line each one pays for. */
export function readHostedSubscriptionItems(subscription: StripeSubscriptionObject | null) {
  return (subscription?.items?.data ?? []).flatMap((item) => {
    const product = item.price?.product;
    const metadata = product && typeof product === "object" ? product.metadata : undefined;
    if (!item.id || metadata?.line_kind !== "hosted_subscription") return [];
    return [{ id: item.id, line: metadata.order_line || undefined, productId: typeof product === "object" ? product?.id : undefined }];
  });
}

/** The order line a page was bought on, when its checkout made more than one page. */
export function readHostedRowLine(checkoutSessionId: string | null | undefined) {
  return checkoutSessionId?.match(/:line:(\d{1,3})$/)?.[1];
}

type LifecycleUpdate = ReturnType<typeof deriveLifecycleUpdate>;

/** A page cancelled on its own follows its own dates; every other page follows the subscription. */
export function deriveRowLifecycle(base: LifecycleUpdate, row: { stripe_checkout_session_id?: string | null; current_period_end?: string | null }, metadata: Record<string, string> | null | undefined, now: Date): LifecycleUpdate {
  const line = readHostedRowLine(row.stripe_checkout_session_id);
  const ended = line ? readEndedHostedLines(metadata)[line] : undefined;
  if (!ended || base.status === "canceled") return base;
  const end = row.current_period_end ?? base.currentPeriodEnd;
  const over = ended.mode === "now" || !end || Date.parse(end) <= now.getTime();
  return over
    ? { ...base, status: "canceled", lifecycleStatus: "EXPIRED", cancelAtPeriodEnd: false, currentPeriodEnd: end, pastDueSince: null }
    : { ...base, status: "active", lifecycleStatus: "CANCELLED_AT_PERIOD_END", cancelAtPeriodEnd: true, currentPeriodEnd: end, pastDueSince: null };
}

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
  cancel_at_period_end?: boolean;
  stripe_checkout_session_id?: string | null;
};

/** What changed for the customer, compared with what we had saved. Only real changes send an email. */
export function readMultiLinkChange(previous: { status?: string | null; cancel_at_period_end?: boolean }, next: { status: string; cancelAtPeriodEnd: boolean }): MultiLinkSubscriptionChange | null {
  if (next.status === "canceled") return previous.status === "canceled" ? null : "ended";
  if (next.cancelAtPeriodEnd && !previous.cancel_at_period_end) return "canceled";
  if (!next.cancelAtPeriodEnd && previous.cancel_at_period_end) return "resumed";
  return null;
}

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

    const changes: MultiLinkChangeInput[] = [];
    for (const row of rows) {
      await assertActive();
      const rowInput = deriveRowLifecycle(lifecycleInput, row, subscription.metadata, now);
      const change = row.lifecycle_status === "RETIRED_INTERNAL" ? null : readMultiLinkChange(row, rowInput);
      if (change) changes.push({ change, hostedSubscriptionId: row.id, stripeSubscriptionId: subscriptionId, code: row.permanent_code, pageUrl: row.hosted_page_url, end: rowInput.currentPeriodEnd ?? row.current_period_end ?? null, eventId: input.eventId });
      const currentPeriodEnd = rowInput.currentPeriodEnd ?? row.current_period_end ?? null;
      const pastDueSince = rowInput.pastDueSince ? row.past_due_since ?? rowInput.pastDueSince : null;
      const lifecycleStatus = row.lifecycle_status === "RETIRED_INTERNAL" ? row.lifecycle_status : rowInput.lifecycleStatus;
      const updatePayload = {
        status: rowInput.status,
        lifecycle_status: lifecycleStatus,
        current_period_end: currentPeriodEnd,
        cancel_at_period_end: rowInput.cancelAtPeriodEnd,
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
    // Saved first, so a failed email never blocks or repeats the update.
    for (const change of changes) {
      await resolved.notify?.(change).catch((error) => console.warn("Multi-Link change email unavailable", change.code, change.change, error));
    }
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
    // Products tell which page each monthly charge pays for.
    retrieveSubscription: (id: string) => getStripeClient().subscriptions.retrieve(id, { expand: ["items.data.price.product"] }),
    isManagedSubscription: async (id: string) => {
      const sessions = await getStripeClient().checkout.sessions.list({ subscription: id, limit: 100 });
      return sessions.data.some((session) => session.metadata?.checkout_intent === "hosted_subscription");
    },
    notify: (change: MultiLinkChangeInput) => notifyMultiLinkSubscriptionChange(change),
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
    past_due_since: readString(value.past_due_since),
    cancel_at_period_end: value.cancel_at_period_end === true,
    stripe_checkout_session_id: readString(value.stripe_checkout_session_id) ?? null
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
