"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminButton } from "@/components/admin/admin-ui";

type Action = "cancel_at_period_end" | "keep" | "cancel_now";
const confirmText: Record<Action, string> = {
  cancel_at_period_end: "Stop renewing this Multi-Link subscription? The page stays live until the paid-through date, then shows \"not active\".",
  keep: "Keep this subscription renewing every month?",
  cancel_now: "End this Multi-Link subscription today? The page shows \"not active\" right away and nothing more is charged. This does not refund anything: refund the order separately.",
};

/** Cancel / keep / end-now buttons for one Stripe-billed Multi-Link page. */
export function MultiLinkSubscriptionActions({ subscriptionId, status, cancelAtPeriodEnd }: { subscriptionId: string; status: string; cancelAtPeriodEnd: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<Action | null>(null);
  const [error, setError] = useState("");
  if (status === "canceled") return <span className="text-xs text-muted">Ended</span>;

  async function run(action: Action) {
    if (busy || !window.confirm(confirmText[action])) return;
    setBusy(action);
    setError("");
    try {
      const response = await fetch("/api/admin/multilink-subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId, action }),
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
