"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  AdminAlert,
  AdminBadge,
  AdminButton,
  AdminCard,
  AdminSelect,
  AdminSummaryCard
} from "@/components/admin/admin-ui";
import type {
  AdminEmailDeliveryOverview,
  EmailDeliveryRecord,
  EmailDeliveryStatus
} from "@/lib/email-deliveries";

type DeliveryFilter = "all" | "problems" | "pending" | "delivered";

export function EmailDeliveryHistory({ overview }: { overview: AdminEmailDeliveryOverview }) {
  const router = useRouter();
  const [filter, setFilter] = useState<DeliveryFilter>("all");
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const deliveries = useMemo(
    () => overview.deliveries.filter((delivery) => matchesFilter(delivery.status, filter)),
    [filter, overview.deliveries]
  );

  async function retryDelivery(id: string) {
    setRetryingId(id);
    setMessage("");
    setError("");
    try {
      const response = await fetch(`/api/admin/email-deliveries/${encodeURIComponent(id)}/retry`, {
        method: "POST"
      });
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(body?.error ?? "The email could not be retried.");
      setMessage("Email retry accepted.");
      router.refresh();
    } catch (retryError) {
      setError(retryError instanceof Error ? retryError.message : "The email could not be retried.");
    } finally {
      setRetryingId(null);
    }
  }

  if (!overview.available) {
    return (
      <AdminAlert tone="warning">
        Email delivery history is unavailable until the email-delivery database migration is applied.
      </AdminAlert>
    );
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminSummaryCard label="Accepted" value={overview.acceptedCount.toLocaleString()} description="Accepted by Resend" />
        <AdminSummaryCard label="Delivered" value={overview.deliveredCount.toLocaleString()} description="Confirmed by delivery webhook" />
        <AdminSummaryCard label="Needs attention" value={overview.problemCount.toLocaleString()} description="Failed, bounced, complained, or suppressed" />
        <AdminSummaryCard label="In progress" value={overview.pendingCount.toLocaleString()} description="Sending, delayed, or retrying" />
      </div>

      <AdminCard className="overflow-hidden">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-ink">Recent attempts</h3>
            <p className="mt-1 text-sm text-muted">Up to 250 recent transactional email attempts.</p>
          </div>
          <AdminSelect
            aria-label="Filter email attempts"
            className="w-full md:w-48"
            value={filter}
            onChange={(event) => setFilter(event.target.value as DeliveryFilter)}
          >
            <option value="all">All attempts</option>
            <option value="problems">Needs attention</option>
            <option value="pending">In progress</option>
            <option value="delivered">Delivered</option>
          </AdminSelect>
        </div>

        {message ? <AdminAlert tone="success" className="mb-4">{message}</AdminAlert> : null}
        {error ? <AdminAlert tone="danger" className="mb-4">{error}</AdminAlert> : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase text-muted">
                <th className="pb-3 pr-4 font-semibold">Time</th>
                <th className="pb-3 pr-4 font-semibold">Message</th>
                <th className="pb-3 pr-4 font-semibold">Recipient</th>
                <th className="pb-3 pr-4 font-semibold">Status</th>
                <th className="pb-3 pr-4 font-semibold">Attempt</th>
                <th className="pb-3 pr-4 font-semibold">Source</th>
                <th className="pb-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {deliveries.map((delivery) => {
                const canRetry = delivery.retryable && delivery.status === "failed" && delivery.attemptNumber < 5;
                return (
                  <tr key={delivery.id}>
                    <td className="py-3 pr-4 text-muted">{formatDate(delivery.createdAt)}</td>
                    <td className="max-w-72 py-3 pr-4">
                      <strong className="block font-semibold text-ink">{formatMessageType(delivery.messageType)}</strong>
                      <span className="mt-1 block truncate text-xs text-muted" title={delivery.subject}>{delivery.subject}</span>
                      {delivery.failureReason ? (
                        <span className="mt-1 block text-xs leading-5 text-red-700">{delivery.failureReason}</span>
                      ) : null}
                    </td>
                    <td className="max-w-64 break-all py-3 pr-4 text-ink">{delivery.recipient}</td>
                    <td className="py-3 pr-4"><DeliveryStatusBadge status={delivery.status} /></td>
                    <td className="py-3 pr-4 text-ink">{delivery.attemptNumber} of 5</td>
                    <td className="py-3 pr-4">{renderSource(delivery)}</td>
                    <td className="py-3">
                      {canRetry ? (
                        <AdminButton
                          type="button"
                          variant="outline"
                          className="min-h-9 px-3 py-1.5 text-xs"
                          loading={retryingId === delivery.id}
                          disabled={Boolean(retryingId)}
                          onClick={() => retryDelivery(delivery.id)}
                        >
                          <RefreshCw aria-hidden="true" className="h-4 w-4" />
                          Retry
                        </AdminButton>
                      ) : (
                        <span className="text-xs text-muted">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {deliveries.length === 0 ? (
                <tr>
                  <td className="py-8 text-center text-muted" colSpan={7}>
                    {overview.deliveries.length === 0
                      ? "No email attempts have been recorded since delivery tracking was enabled."
                      : "No email attempts match this filter."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </AdminCard>
    </div>
  );
}

function DeliveryStatusBadge({ status }: { status: EmailDeliveryStatus }) {
  const tone = status === "delivered"
    ? "success"
    : status === "accepted" || status === "retried"
      ? "brand"
      : status === "failed" || status === "bounced" || status === "complained" || status === "suppressed"
        ? "danger"
        : status === "delayed"
          ? "warning"
          : "neutral";
  return <AdminBadge tone={tone}>{formatStatus(status)}</AdminBadge>;
}

function matchesFilter(status: EmailDeliveryStatus, filter: DeliveryFilter) {
  if (filter === "all") return true;
  if (filter === "delivered") return status === "delivered";
  if (filter === "problems") return ["failed", "bounced", "complained", "suppressed"].includes(status);
  return ["sending", "delayed", "retrying"].includes(status);
}

function renderSource(delivery: EmailDeliveryRecord) {
  if (delivery.entityType === "order" && delivery.entityId) {
    return <a className="font-semibold text-brand" href={`/admin/orders/${encodeURIComponent(delivery.entityId)}`}>Order</a>;
  }
  if (delivery.entityType === "customer") return <span className="text-muted">Customer</span>;
  if (delivery.entityType === "hosted_page") return <span className="text-muted">Multi-Link</span>;
  if (delivery.entityType === "email_template") return <span className="text-muted">Template test</span>;
  return <span className="text-muted">System</span>;
}

function formatMessageType(value: string) {
  const labels: Record<string, string> = {
    customer_activation: "Customer activation",
    customer_login_link: "Customer login link",
    customer_order_activation: "Order account activation",
    hosted_account_ready: "Multi-Link ready",
    hosted_setup_activation: "Multi-Link activation",
    paid_customer_activation: "Paid account activation",
    paid_order_admin: "Admin paid-order alert",
    paid_order_customer: "Customer order confirmation",
    shipping_tracking_customer: "Shipping update",
    support_request_admin: "Support request alert",
    template_test: "Template test"
  };
  return labels[value] ?? value.replaceAll("_", " ");
}

function formatStatus(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString() : "Date unavailable";
}
