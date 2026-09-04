"use client";

import { useState } from "react";
import { BadgeDollarSign } from "lucide-react";
import { useRouter } from "next/navigation";
import { AdminAlert, AdminBadge, AdminButton, AdminCard } from "@/components/admin/admin-ui";

type OrderRefundFormProps = {
  orderId: string;
  alreadyRefunded: boolean;
  hasSubscription: boolean;
  refundId?: string | null;
};

export function OrderRefundForm({
  orderId,
  alreadyRefunded,
  hasSubscription,
  refundId,
}: OrderRefundFormProps) {
  const router = useRouter();
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (alreadyRefunded) {
    return (
      <AdminCard title="Payment actions">
        <div className="flex flex-wrap items-center gap-3">
          <AdminBadge tone="warning">Refunded</AdminBadge>
          {refundId ? <span className="font-mono text-xs text-muted">{refundId}</span> : null}
        </div>
      </AdminCard>
    );
  }

  async function submitRefund() {
    if (!confirmed || submitting) return;
    setSubmitting(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/orders/${orderId}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: "REFUND" }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || "The refund could not be completed.");
      }
      router.refresh();
    } catch (refundError) {
      setError(refundError instanceof Error ? refundError.message : "The refund could not be completed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AdminCard
      title="Payment actions"
      description="Refund the complete Stripe charge for this order. Partial refunds remain available in Stripe."
    >
      {hasSubscription ? (
        <AdminAlert tone="warning" className="mb-4">
          Refunding this charge does not cancel the customer&apos;s recurring Multi-Link subscription. Manage that subscription separately in Stripe.
        </AdminAlert>
      ) : null}
      {error ? <AdminAlert tone="danger" className="mb-4">{error}</AdminAlert> : null}
      <label className="mb-4 flex items-start gap-3 text-sm font-semibold leading-6 text-ink">
        <input
          className="mt-1 h-4 w-4"
          type="checkbox"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
        />
        I understand this refunds the full Stripe charge and cannot be undone here.
      </label>
      <AdminButton
        type="button"
        variant="danger"
        disabled={!confirmed}
        loading={submitting}
        onClick={submitRefund}
      >
        <BadgeDollarSign size={16} />
        Refund full charge
      </AdminButton>
    </AdminCard>
  );
}
