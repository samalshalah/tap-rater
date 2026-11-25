import { randomUUID } from "node:crypto";
import type Stripe from "stripe";
import { getStripeClient } from "@/lib/checkout";
import { endedLineKey, processHostedSubscriptionLifecycleEvent, readEndedHostedLines, readHostedSubscriptionItems, type HostedSubscriptionLifecycleResult } from "@/lib/hosted-subscription-lifecycle";
import { hostedMultiLinkServiceAddon } from "@/lib/service-addons";

/**
 * What a customer or admin can do to a Multi-Link page's $9.99 subscription.
 * - cancel_at_period_end: stop renewing; the page stays live until the paid-through date.
 * - keep: undo that.
 * - cancel_now: end it today; the page shows "not active" straight away (admin only).
 * When one checkout bought several pages, these act on the one page only.
 */
export type MultiLinkSubscriptionAction = "cancel_at_period_end" | "keep" | "cancel_now";

export type MultiLinkSubscriptionActionResult =
  | { ok: true; synced: boolean }
  | { ok: false; status: number; error: string };

type SubscriptionLike = Parameters<typeof readHostedSubscriptionItems>[0] & { status?: string | null; metadata?: Record<string, string> | null };

export type MultiLinkSubscriptionDependencies = {
  update: (id: string, params: Stripe.SubscriptionUpdateParams) => Promise<unknown>;
  cancel: (id: string) => Promise<unknown>;
  retrieve: (id: string) => Promise<SubscriptionLike>;
  sync: (input: Parameters<typeof processHostedSubscriptionLifecycleEvent>[0]) => Promise<HostedSubscriptionLifecycleResult>;
};

const defaultDependencies = (): MultiLinkSubscriptionDependencies => {
  const subscriptions = getStripeClient().subscriptions;
  return {
    update: (id, params) => subscriptions.update(id, params),
    cancel: (id) => subscriptions.cancel(id),
    retrieve: (id) => subscriptions.retrieve(id, { expand: ["items.data.price.product"] }) as Promise<SubscriptionLike>,
    sync: (input) => processHostedSubscriptionLifecycleEvent(input),
  };
};

/** Only real Stripe subscriptions can be changed; granted and manual pages have none. */
export function isStripeSubscriptionId(id: string | null | undefined): id is string {
  return typeof id === "string" && /^sub_[A-Za-z0-9]+$/.test(id);
}

type PagePlan =
  | { kind: "subscription" }
  | { kind: "page"; params: Stripe.SubscriptionUpdateParams | null }
  | { kind: "refused"; error: string };

/**
 * Works out whether an action can apply to one page alone. It can when the subscription pays for
 * other pages too: the page's monthly charge is removed (or put back) and the subscription notes
 * how it ended. The last remaining page acts on the whole subscription, as before.
 */
export function planPageChange(subscription: SubscriptionLike, action: MultiLinkSubscriptionAction, line: string | undefined): PagePlan {
  if (!line) return { kind: "subscription" };
  const items = readHostedSubscriptionItems(subscription);
  const ended = readEndedHostedLines(subscription?.metadata)[line];
  const mine = items.find((item) => item.line === line);
  const key = endedLineKey(line);

  if (action === "keep") {
    if (mine) return { kind: "subscription" };
    if (!ended) return { kind: "subscription" };
    if (ended.mode === "now") return { kind: "refused", error: "This page has already ended and can't be kept." };
    return { kind: "page", params: {
      items: [{ price_data: { currency: "usd", product: ended.productId, recurring: { interval: "month" }, unit_amount: hostedMultiLinkServiceAddon.monthlyPriceCents }, quantity: 1 }],
      proration_behavior: "none",
      metadata: { [key]: "" },
    } };
  }

  const mode = action === "cancel_now" ? "now" : "period_end";
  if (!mine) {
    if (!ended) return { kind: "subscription" };
    // Already off the bill: only "end now" changes anything (it stops the remaining paid days).
    return { kind: "page", params: mode === "now" && ended.mode === "period_end" ? { metadata: { [key]: `now:${ended.productId}` } } : null };
  }
  if (items.length < 2 || !mine.productId) return { kind: "subscription" };
  return { kind: "page", params: {
    items: [{ id: mine.id, deleted: true }],
    proration_behavior: "none",
    metadata: { [key]: `${mode}:${mine.productId}` },
  } };
}

export async function changeMultiLinkSubscription(
  subscriptionId: string | null | undefined,
  action: MultiLinkSubscriptionAction,
  dependencies: MultiLinkSubscriptionDependencies = defaultDependencies(),
  /** The page's order line (see readHostedRowLine), when its checkout bought several pages. */
  line?: string,
): Promise<MultiLinkSubscriptionActionResult> {
  if (!isStripeSubscriptionId(subscriptionId)) {
    return { ok: false, status: 409, error: "This page isn't billed through Stripe, so there is no subscription to change." };
  }
  let wholeEnded = false;
  try {
    const current = await dependencies.retrieve(subscriptionId);
    const ended = current?.status === "canceled" || current?.status === "incomplete_expired";
    if (ended && action === "keep") {
      return { ok: false, status: 409, error: "This subscription has already ended and can't be kept." };
    }
    if (!ended) {
      const plan = planPageChange(current, action, line);
      if (plan.kind === "refused") return { ok: false, status: 409, error: plan.error };
      if (plan.kind === "page") {
        if (plan.params) await dependencies.update(subscriptionId, plan.params);
      } else if (action === "cancel_now") {
        await dependencies.cancel(subscriptionId);
        wholeEnded = true;
      } else {
        await dependencies.update(subscriptionId, { cancel_at_period_end: action === "cancel_at_period_end" });
      }
    }
  } catch (error) {
    console.error("Multi-Link subscription change failed", subscriptionId, action, error);
    return { ok: false, status: 502, error: "Stripe couldn't change the subscription. Try again." };
  }

  // Update the account and the public page now instead of waiting for Stripe's webhook.
  // The webhook still arrives later and reads the same state, so nothing is applied twice.
  const synced = await dependencies.sync({
    eventId: `tap_rater:${action}:${randomUUID()}`,
    eventType: wholeEnded ? "customer.subscription.deleted" : "customer.subscription.updated",
    object: { id: subscriptionId },
  }).catch(() => ({ ok: false as const, error: "sync failed" }));
  if (!synced.ok) console.warn("Multi-Link subscription sync deferred to webhook", subscriptionId, synced.error);
  return { ok: true, synced: synced.ok };
}

export type ReviewsSubscriptionDependencies = {
  retrieve: (id: string) => Promise<{ status?: string | null; schedule?: unknown; cancel_at?: number | null; metadata?: Record<string, string> | null } | null>;
  update: (id: string, params: { cancel_at_period_end: boolean; cancel_at?: "" }) => Promise<unknown>;
  cancel: (id: string) => Promise<unknown>;
  sync: (subscriptionId: string, eventType: "customer.subscription.updated" | "customer.subscription.deleted") => Promise<unknown>;
};

const defaultReviewsDependencies = (): ReviewsSubscriptionDependencies => {
  const subscriptions = getStripeClient().subscriptions;
  return {
    retrieve: (id) => subscriptions.retrieve(id),
    update: (id, params) => subscriptions.update(id, { ...params, proration_behavior: "none" }),
    cancel: (id) => subscriptions.cancel(id),
    // Same sync the webhook runs; it also emails the customer once about the change.
    sync: async (id, eventType) => {
      const { syncMarketingSubscription } = await import("@/lib/marketing-subscriptions");
      return syncMarketingSubscription({ id: `tap_rater:admin:${randomUUID()}`, type: eventType, data: { object: { id, metadata: { tap_rater: "marketing_growth_v1" } } } } as never);
    },
  };
};

/** Admin: the same three actions for a Google Reviews subscription. */
export async function changeReviewsSubscription(
  subscriptionId: string,
  action: MultiLinkSubscriptionAction,
  dependencies: ReviewsSubscriptionDependencies = defaultReviewsDependencies(),
): Promise<MultiLinkSubscriptionActionResult> {
  if (!isStripeSubscriptionId(subscriptionId)) return { ok: false, status: 400, error: "Choose a Google Reviews subscription." };
  try {
    const current = await dependencies.retrieve(subscriptionId);
    if (current?.metadata?.tap_rater !== "marketing_growth_v1") return { ok: false, status: 409, error: "That is not a Google Reviews subscription." };
    const ended = current.status === "canceled" || current.status === "incomplete_expired";
    if (ended && action === "keep") return { ok: false, status: 409, error: "This subscription has already ended and can't be kept." };
    if (!ended && action !== "cancel_now" && current.schedule) {
      return { ok: false, status: 409, error: "This customer has a location change scheduled. Use End now, or ask them to cancel from their Subscription page." };
    }
    if (!ended) {
      if (action === "cancel_now") await dependencies.cancel(subscriptionId);
      else await dependencies.update(subscriptionId, { cancel_at_period_end: action === "cancel_at_period_end", ...(action === "keep" && current.cancel_at ? { cancel_at: "" as const } : {}) });
    }
  } catch (error) {
    console.error("Reviews subscription change failed", subscriptionId, action, error);
    return { ok: false, status: 502, error: "Stripe couldn't change the subscription. Try again." };
  }
  const synced = await dependencies.sync(subscriptionId, action === "cancel_now" ? "customer.subscription.deleted" : "customer.subscription.updated")
    .then(() => true, (error) => { console.warn("Reviews subscription sync deferred to webhook", subscriptionId, error); return false; });
  return { ok: true, synced };
}
