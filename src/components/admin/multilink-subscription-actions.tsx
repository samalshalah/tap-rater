"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminButton } from "@/components/admin/admin-ui";

type Action = "cancel_at_period_end" | "keep" | "cancel_now";
type Product = "multilink" | "reviews";
const confirmText: Record<Product, Record<Action, string>> = {
  multilink: {
    cancel_at_period_end: "Stop renewing this Multi-Link subscription? The page stays live until the paid-through date, then shows \"not active\".",
    keep: "Keep this subscription renewing every month?",
    cancel_now: "End this Multi-Link subscription today? The page shows \"not active\" right away and nothing more is charged. This does not refund anything: refund the order separately.",
  },
  reviews: {
    cancel_at_period_end: "Stop renewing this Google Reviews subscription? Service stays active until the paid-through date. The customer is emailed.",
    keep: "Keep this Google Reviews subscription renewing every month? The customer is emailed.",
    cancel_now: "End this Google Reviews subscription today? Service stops right away and nothing more is charged. This does not refund anything: refund in Stripe if needed.",
  },
};

/** Cancel / keep / end-now buttons for one Stripe-billed Multi-Link page or Google Reviews subscription. */
export function MultiLinkSubscriptionActions({ subscriptionId, status, cancelAtPeriodEnd, product = "multilink" }: { subscriptionId: string; status: string; cancelAtPeriodEnd: boolean; product?: Product }) {
  const router = useRouter();
  const [busy, setBusy] = useState<Action | null>(null);
  const [error, setError] = useState("");
  if (status === "canceled" || status === "incomplete_expired") return <span className="text-xs text-muted">Ended</span>;

  async function run(action: Action) {
    if (busy || !window.confirm(confirmText[product][action])) return;
    setBusy(action);
    setError("");
    try {
      const response = await fetch("/api/admin/multilink-subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId, action, product }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.error || "The subscription could not be changed.");
      router.refresh();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "The subscription could not be changed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-1.5">
      <div className="flex flex-wrap gap-1.5">
        {cancelAtPeriodEnd
          ? <AdminButton type="button" className="min-h-8 px-2.5 text-xs" loading={busy === "keep"} onClick={() => run("keep")}>Keep renewing</AdminButton>
          : <AdminButton type="button" className="min-h-8 px-2.5 text-xs" loading={busy === "cancel_at_period_end"} onClick={() => run("cancel_at_period_end")}>Cancel at period end</AdminButton>}
        <AdminButton type="button" variant="danger" className="min-h-8 px-2.5 text-xs" loading={busy === "cancel_now"} onClick={() => run("cancel_now")}>End now</AdminButton>
      </div>
      {error ? <p role="alert" className="text-xs text-red-700">{error}</p> : null}
    </div>
  );
}
