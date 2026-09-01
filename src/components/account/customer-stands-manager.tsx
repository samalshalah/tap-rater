"use client";

import Link from "next/link";
import { CheckCircle2, ExternalLink, X } from "lucide-react";
import { useState } from "react";
import type { CustomerPortalStand } from "@/lib/customer-portal";
import { formatOrderReference } from "@/lib/order-reference";

export function CustomerStandsManager({ stands }: { stands: CustomerPortalStand[] }) {
  const [selectedStand, setSelectedStand] = useState<CustomerPortalStand | null>(null);
  const [standList, setStandList] = useState(stands);

  if (!stands.length) {
    return <EmptyState message="No purchased stands are linked to this account yet." />;
  }

  return (
    <>
      <section className="grid gap-3">
        {standList.map((stand) => (
          <StandCard key={stand.id} stand={stand} onOpen={() => setSelectedStand(stand)} />
        ))}
      </section>
      {selectedStand ? (
        <StandDetailModal
          stand={selectedStand}
          onClose={() => setSelectedStand(null)}
          onStandChange={(updatedStand) => {
            setSelectedStand(updatedStand);
            setStandList((current) => current.map((stand) => stand.id === updatedStand.id ? updatedStand : stand));
          }}
        />
      ) : null}
    </>
  );
}

function StandCard({ stand, onOpen }: { stand: CustomerPortalStand; onOpen: () => void }) {
  const isMultiLink = stand.kind === "multilink";

  return (
    <article className="rounded-md border border-line bg-white p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-medium text-ink">{stand.title}</h3>
            {stand.quantity > 1 ? <span className="rounded-full bg-soft px-2 py-1 text-xs text-muted">Qty {stand.quantity}</span> : null}
            <span className="rounded-full bg-teal-50 px-2 py-1 text-xs font-medium text-brand">{formatKind(stand.kind)}</span>
          </div>
          <p className="mt-2 text-sm text-muted">Order {formatOrderReference(stand.orderReference)}</p>
          <div className="mt-4 grid gap-2 text-sm md:grid-cols-3">
            <StatusPill label="Proof" value={formatProofStatus(stand.proofStatus)} />
            <StatusPill label="Production" value={formatStatus(stand.productionStatus)} />
            <StatusPill label="Shipping" value={formatStatus(stand.shippingStatus)} />
          </div>
          {isMultiLink && stand.hostedPageUrl ? (
            <a href={stand.hostedPageUrl} target="_blank" rel="noreferrer" className="mt-3 block break-all text-sm text-brand">
              {stand.hostedPageUrl}
            </a>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {isMultiLink ? (
            <Link href={stand.primaryActionHref} className="tr-button-primary">
              Manage links
            </Link>
          ) : null}
          <button type="button" onClick={onOpen} className={isMultiLink ? "tr-button-secondary" : "tr-button-primary"}>
            {stand.proofStatus === "not_needed" ? "View details" : "View proof"}
          </button>
        </div>
      </div>
    </article>
  );
}

function StandDetailModal({
  stand,
  onClose,
  onStandChange
}: {
  stand: CustomerPortalStand;
  onClose: () => void;
  onStandChange: (stand: CustomerPortalStand) => void;
}) {
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const canReviewProof = stand.proofStatus !== "not_needed";

  async function submitProofAction(action: "approve" | "request_change") {
    setStatus("saving");
    setMessage("");

    const response = await fetch("/api/account/stands/proof", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: stand.orderId,
        lineItemIndex: stand.lineItemIndex,
        action,
        note
      })
    });
    const body = await response.json().catch(() => null);

    if (!response.ok) {
      setStatus("error");
      setMessage(body?.error ?? "Proof update could not be saved.");
      return;
    }

    const nextStand = {
      ...stand,
      proofStatus: action === "approve" ? "approved" : "needs_review",
      productionStatus: typeof body?.productionStatus === "string" ? body.productionStatus : stand.productionStatus
    } satisfies CustomerPortalStand;

    setStatus("success");
    setMessage(action === "approve" ? "Proof approved. Tap Rater can continue production review." : "Change request sent. Tap Rater will update the proof before production.");
    setNote("");
    onStandChange(nextStand);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/45 px-4 py-6" role="dialog" aria-modal="true" aria-labelledby="stand-detail-title">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-line p-5">
          <div>
            <p className="tr-eyebrow">Stand proof</p>
            <h2 id="stand-detail-title" className="mt-2 text-xl font-medium text-ink">{stand.title}</h2>
            <p className="mt-1 text-sm text-muted">Order {formatOrderReference(stand.orderReference)}</p>
          </div>
          <button type="button" onClick={onClose} className="tr-icon-button" aria-label="Close proof details">
            <X size={18} />
          </button>
        </div>
        <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="rounded-md border border-line bg-soft p-4">
            {stand.proofPreviewUrl ? (
              <img src={stand.proofPreviewUrl} alt={`${stand.title} proof preview`} className="mx-auto max-h-[560px] w-full object-contain" />
            ) : (
              <div className="grid min-h-[360px] place-items-center rounded-md border border-dashed border-line bg-white p-6 text-center text-sm text-muted">
                Proof preview will appear here after Tap Rater prepares it.
              </div>
            )}
          </div>
          <aside className="grid content-start gap-3 text-sm">
            <DetailLine label="Type" value={formatKind(stand.kind)} />
            <DetailLine label="Business" value={stand.businessName ?? "-"} />
            <DetailLine label="Proof" value={formatProofStatus(stand.proofStatus)} />
            <DetailLine label="Production" value={formatStatus(stand.productionStatus)} />
            <DetailLine label="Shipping" value={formatStatus(stand.shippingStatus)} />
            {stand.logoUrl ? <DetailLink label="Logo" href={stand.logoUrl} /> : null}
            {stand.destinationUrl ? <DetailLink label="Destination" href={stand.destinationUrl} /> : null}
            {stand.qrTargetUrl && stand.qrTargetUrl !== stand.destinationUrl ? <DetailLink label="QR target" href={stand.qrTargetUrl} /> : null}
            {stand.nfcTargetUrl && stand.nfcTargetUrl !== stand.destinationUrl ? <DetailLink label="NFC target" href={stand.nfcTargetUrl} /> : null}
            {stand.kind === "multilink" && stand.primaryActionHref ? (
              <Link href={stand.primaryActionHref} className="tr-button-primary justify-center">
                Manage Multi-Link page
              </Link>
            ) : null}
            {canReviewProof ? (
              <div className="rounded-md border border-line p-3">
                {stand.proofStatus === "approved" ? (
                  <p className="flex items-center gap-2 text-sm text-brand">
                    <CheckCircle2 size={16} />
                    Proof approved
                  </p>
                ) : (
                  <div className="grid gap-3">
                    <p className="text-sm text-muted">Approve the prepared proof or request a change. You do not need to rebuild the stand.</p>
                    <button type="button" disabled={status === "saving"} onClick={() => submitProofAction("approve")} className="tr-button-primary justify-center">
                      Approve proof
                    </button>
                    <textarea
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      placeholder="Tell Tap Rater what to change"
                      className="tr-textarea min-h-24"
                    />
                    <button type="button" disabled={status === "saving"} onClick={() => submitProofAction("request_change")} className="tr-button-secondary justify-center">
                      Request proof changes
                    </button>
                  </div>
                )}
                {message ? (
                  <p className={`mt-3 rounded-md px-3 py-2 text-sm ${status === "error" ? "bg-red-50 text-red-700" : "bg-teal-50 text-brand"}`}>
                    {message}
                  </p>
                ) : null}
              </div>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ label, value }: { label: string; value: string }) {
  return (
    <p className="rounded-md bg-soft px-3 py-2">
      <span className="block text-xs text-muted">{label}</span>
      <span className="mt-1 block capitalize text-ink">{value}</span>
    </p>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="rounded-md bg-soft px-3 py-2">
      <span className="block text-xs text-muted">{label}</span>
      <span className="mt-1 block break-words capitalize text-ink">{value}</span>
    </p>
  );
}

function DetailLink({ label, href }: { label: string; href: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 rounded-md bg-soft px-3 py-2 text-brand">
      <span className="min-w-0">
        <span className="block text-xs text-muted">{label}</span>
        <span className="mt-1 block truncate normal-case">{href}</span>
      </span>
      <ExternalLink size={15} className="shrink-0" />
    </a>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="rounded-md border border-dashed border-line bg-white p-5 text-sm text-muted">{message}</div>;
}

function formatKind(kind: CustomerPortalStand["kind"]) {
  if (kind === "multilink") return "Multi-Link";
  if (kind === "branded") return "Branded Direct";
  if (kind === "custom") return "Custom";
  return "Standard Direct";
}

function formatProofStatus(value: CustomerPortalStand["proofStatus"]) {
  if (value === "not_needed") return "Not needed";
  if (value === "approved") return "Approved";
  return "Needs review";
}

function formatStatus(value: string) {
  return value.replaceAll("_", " ");
}
