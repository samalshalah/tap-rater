"use client";

import Link from "next/link";
import { ExternalLink, X } from "lucide-react";
import { useState } from "react";
import { HostedPageEditor } from "@/components/account/hosted-page-editor";
import type { CustomerPortalStand } from "@/lib/customer-portal";
import type { HostedPageEditorRecord } from "@/lib/hosted-page-editor-shared";
import { formatOrderReference } from "@/lib/order-reference";

export function CustomerStandsManager({
  stands,
  hostedPages = {}
}: {
  stands: CustomerPortalStand[];
  hostedPages?: Record<string, HostedPageEditorRecord>;
}) {
  const [selectedStand, setSelectedStand] = useState<CustomerPortalStand | null>(null);

  if (!stands.length) {
    return <EmptyState message="No purchased stands are linked to this account yet." />;
  }

  return (
    <>
      <section className="grid gap-3">
        {stands.map((stand) => (
          <StandCard key={stand.id} stand={stand} onOpen={() => setSelectedStand(stand)} />
        ))}
      </section>
      {selectedStand ? <StandDetailModal stand={selectedStand} hostedPage={hostedPages[selectedStand.id]} onClose={() => setSelectedStand(null)} /> : null}
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
          <Link href={`/account/orders#order-${encodeURIComponent(formatOrderReference(stand.orderReference))}`} className="mt-2 inline-flex text-sm text-brand hover:underline">
            Order {formatOrderReference(stand.orderReference)}
          </Link>
          <div className="mt-4 grid gap-2 text-sm md:max-w-sm">
            <StatusPill label="Shipping" value={formatStatus(stand.shippingStatus)} />
          </div>
          {isMultiLink && stand.hostedPageUrl ? (
            <a href={stand.hostedPageUrl} target="_blank" rel="noreferrer" className="mt-3 block break-all text-sm text-brand">
              {stand.hostedPageUrl}
            </a>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <button type="button" onClick={onOpen} className="tr-button-primary">
            {isMultiLink ? "Set up landing page" : "View stand"}
          </button>
        </div>
      </div>
    </article>
  );
}

function StandDetailModal({
  stand,
  hostedPage,
  onClose
}: {
  stand: CustomerPortalStand;
  hostedPage?: HostedPageEditorRecord;
  onClose: () => void;
}) {
  const isMultiLink = stand.kind === "multilink";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/45 px-4 py-6" role="dialog" aria-modal="true" aria-labelledby="stand-detail-title">
      <div className={`max-h-[90vh] w-full overflow-y-auto rounded-lg bg-white shadow-2xl ${isMultiLink ? "max-w-6xl" : "max-w-4xl"}`}>
        <div className="flex items-start justify-between gap-4 border-b border-line p-5">
          <div>
            <p className="tr-eyebrow">{isMultiLink ? "Multi-Link stand setup" : "Purchased stand"}</p>
            <h2 id="stand-detail-title" className="mt-2 text-xl font-medium text-ink">{stand.title}</h2>
            <p className="mt-1 text-sm text-muted">Order {formatOrderReference(stand.orderReference)}</p>
          </div>
          <button type="button" onClick={onClose} className="tr-icon-button" aria-label="Close stand details">
            <X size={18} />
          </button>
        </div>
        {isMultiLink ? (
          <div className="p-5">
            {hostedPage ? (
              <HostedPageEditor initialPage={hostedPage} />
            ) : (
              <EmptyState message="This Multi-Link landing page is being prepared. The account is connected, but the editable page record is not available yet." />
            )}
          </div>
        ) : (
        <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="rounded-md border border-line bg-soft p-4">
            {stand.proofPreviewUrl ? (
              <img src={stand.proofPreviewUrl} alt={`${stand.title} preview`} className="mx-auto max-h-[560px] w-full object-contain" />
            ) : (
              <div className="grid min-h-[360px] place-items-center rounded-md border border-dashed border-line bg-white p-6 text-center text-sm text-muted">
                Stand preview will appear here when available.
              </div>
            )}
          </div>
          <aside className="grid content-start gap-3 text-sm">
            <DetailLine label="Type" value={formatKind(stand.kind)} />
            <DetailLine label="Business" value={stand.businessName ?? "-"} />
            <DetailLine label="Shipping" value={formatStatus(stand.shippingStatus)} />
            {stand.logoUrl ? <DetailLink label="Logo" href={stand.logoUrl} /> : null}
            {stand.destinationUrl ? <DetailLink label="Destination" href={stand.destinationUrl} /> : null}
            {stand.qrTargetUrl && stand.qrTargetUrl !== stand.destinationUrl ? <DetailLink label="QR target" href={stand.qrTargetUrl} /> : null}
            {stand.nfcTargetUrl && stand.nfcTargetUrl !== stand.destinationUrl ? <DetailLink label="NFC target" href={stand.nfcTargetUrl} /> : null}
          </aside>
        </div>
        )}
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

function formatStatus(value: string) {
  return value.replaceAll("_", " ");
}
