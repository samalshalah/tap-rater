import { randomUUID } from "node:crypto";
import { getStripeClient } from "@/lib/checkout";
import { processHostedSubscriptionLifecycleEvent, type HostedSubscriptionLifecycleResult } from "@/lib/hosted-subscription-lifecycle";

/**
 * What a customer or admin can do to a Multi-Link page's $9.99 subscription.
 * - cancel_at_period_end: stop renewing; the page stays live until the paid-through date.
 * - keep: undo that.
 * - cancel_now: end it today; the page shows "not active" straight away (admin only).
 */
export type MultiLinkSubscriptionAction = "cancel_at_period_end" | "keep" | "cancel_now";

export type MultiLinkSubscriptionActionResult =
  | { ok: true; synced: boolean }
  | { ok: false; status: number; error: string };

export type MultiLinkSubscriptionDependencies = {
  update: (id: string, params: { cancel_at_period_end: boolean }) => Promise<unknown>;
  cancel: (id: string) => Promise<unknown>;
  retrieve: (id: string) => Promise<{ status?: string | null } | null>;
  sync: (input: Parameters<typeof processHostedSubscriptionLifecycleEvent>[0]) => Promise<HostedSubscriptionLifecycleResult>;
};

const defaultDependencies = (): MultiLinkSubscriptionDependencies => {
  const subscriptions = getStripeClient().subscriptions;
  return {
    update: (id, params) => subscriptions.update(id, params),
    cancel: (id) => subscriptions.cancel(id),
    retrieve: (id) => subscriptions.retrieve(id),
    sync: (input) => processHostedSubscriptionLifecycleEvent(input),
  };
};

/** Only real Stripe subscriptions can be changed; granted and manual pages have none. */
export function isStripeSubscriptionId(id: string | null | undefined): id is string {
  return typeof id === "string" && /^sub_[A-Za-z0-9]+$/.test(id);
}

export async function changeMultiLinkSubscription(
  subscriptionId: string | null | undefined,
  action: MultiLinkSubscriptionAction,
  dependencies: MultiLinkSubscriptionDependencies = defaultDependencies(),
): Promise<MultiLinkSubscriptionActionResult> {
  if (!isStripeSubscriptionId(subscriptionId)) {
    return { ok: false, status: 409, error: "This page isn't billed through Stripe, so there is no subscription to change." };
  }
  try {
    const current = await dependencies.retrieve(subscriptionId);
    const ended = current?.status === "canceled" || current?.status === "incomplete_expired";
    if (ended && action === "keep") {
      return { ok: false, status: 409, error: "This subscription has already ended and can't be kept." };
    }
    if (!ended) {
      if (action === "cancel_now") await dependencies.cancel(subscriptionId);
      else await dependencies.update(subscriptionId, { cancel_at_period_end: action === "cancel_at_period_end" });
    }
  } catch (error) {
    console.error("Multi-Link subscription change failed", subscriptionId, action, error);
    return { ok: false, status: 502, error: "Stripe couldn't change the subscription. Try again." };
  }

  // Update the account and the public page now instead of waiting for Stripe's webhook.
  // The webhook still arrives later and reads the same state, so nothing is applied twice.
  const synced = await dependencies.sync({
    eventId: `tap_rater:${action}:${randomUUID()}`,
    eventType: action === "cancel_now" ? "customer.subscription.deleted" : "customer.subscription.updated",
    object: { id: subscriptionId },
  }).catch(() => ({ ok: false as const, error: "sync failed" }));
  if (!synced.ok) console.warn("Multi-Link subscription sync deferred to webhook", subscriptionId, synced.error);
  return { ok: true, synced: synced.ok };
}
