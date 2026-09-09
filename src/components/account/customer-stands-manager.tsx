"use client";

import Link from "next/link";
import { ExternalLink, X } from "lucide-react";
import { useId, useState } from "react";
import { HostedPageEditor } from "@/components/account/hosted-page-editor";
import { StandPreview } from "@/components/account/stand-preview";
import { ModalDialog } from "@/components/ui/modal-dialog";
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
  const [showStandPreview, setShowStandPreview] = useState(false);

  if (!stands.length) {
    return <EmptyState message="No stands are linked to this account yet." />;
  }

  return (
    <>
      <section className="grid gap-3">
        {stands.map((stand) => (
          <StandCard key={stand.id} stand={stand} hasHostedPage={Boolean(hostedPages[stand.id])}
            onOpen={(preview = false) => { setShowStandPreview(preview); setSelectedStand(stand); }} />
        ))}
      </section>
      {selectedStand ? <StandDetailModal stand={selectedStand} hostedPage={hostedPages[selectedStand.id]} showStandPreview={showStandPreview} onClose={() => setSelectedStand(null)} /> : null}
    </>
  );
}

function StandCard({ stand, hasHostedPage, onOpen }: { stand: CustomerPortalStand; hasHostedPage: boolean; onOpen: (preview?: boolean) => void }) {
  const isMultiLink = stand.kind === "multilink";
  const historyOnly = isMultiLink && !hasHostedPage && !stand.hostedPageCode && !stand.hostedPageUrl && !stand.multiLinkSetupPending;

  return (
    <article className="rounded-md border border-line bg-white p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-medium text-ink">{stand.title}</h3>
            {stand.quantity > 1 ? <span className="rounded-full bg-soft px-2 py-1 text-xs text-muted">Qty {stand.quantity}</span> : null}
            <span className="rounded-full bg-teal-50 px-2 py-1 text-xs font-medium text-brand">{formatKind(stand.kind)}</span>
            <span className="rounded-full bg-soft px-2 py-1 text-xs capitalize text-muted">{formatPaymentStatus(stand.paymentStatus)}</span>
          </div>
          <p className="mt-2 max-w-full break-all text-sm text-muted">
            Order {formatOrderReference(stand.orderReference)}
          </p>
          {isMultiLink && stand.hostedPageUrl ? (
            <a href={stand.hostedPageUrl} target="_blank" rel="noreferrer" className="mt-3 block break-all text-sm text-brand">
              {stand.hostedPageUrl}
            </a>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {isMultiLink && stand.proofStatus === "approved" && stand.proofPreviewUrl ? (
            <button type="button" onClick={() => onOpen(true)} className="tr-button-ghost">View stand preview</button>
          ) : null}
          {historyOnly ? (
            <Link href="/account/orders#invoices" className="tr-button-ghost">View billing</Link>
          ) : (
            <button type="button" onClick={() => onOpen()} className="tr-button-primary">
              {isMultiLink && hasHostedPage ? "Manage links" : "View stand"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function StandDetailModal({
  stand,
  hostedPage,
  showStandPreview,
  onClose
}: {
  stand: CustomerPortalStand;
  hostedPage?: HostedPageEditorRecord;
  showStandPreview: boolean;
  onClose: () => void;
}) {
  const isMultiLink = stand.kind === "multilink" && !showStandPreview;
  const headingId = useId();

  return (
    <ModalDialog labelledBy={headingId} onClose={onClose} className="px-3 py-2">
      <div className={`flex max-h-[calc(100dvh-1rem)] w-full min-w-0 flex-col rounded-lg bg-white shadow-2xl ${isMultiLink ? "max-w-[92rem] overflow-hidden" : "max-w-4xl overflow-y-auto"}`}>
        <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-2">
          <div className="min-w-0">
            <p className="tr-eyebrow">{isMultiLink && hostedPage ? "Multi-Link page" : "Stand details"}</p>
            <h2 id={headingId} tabIndex={-1} data-dialog-heading className="mt-1 break-words text-base font-medium text-ink focus:outline-none">{stand.title}</h2>
          </div>
          <button type="button" onClick={onClose} className="tr-icon-button shrink-0" aria-label="Close stand details">
            <X size={18} />
          </button>
        </div>
        {isMultiLink ? (
          <div className="min-h-0 overflow-hidden p-3">
            {hostedPage ? (
              <HostedPageEditor initialPage={hostedPage} />
            ) : (
              <EmptyState message={stand.multiLinkSetupPending
                ? "Payment is confirmed. Your Multi-Link page is being prepared."
                : "The page editor is unavailable. Contact support if you need help accessing this page."} />
            )}
          </div>
        ) : (
        <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <StandPreview key={stand.id} url={stand.proofPreviewUrl} title={stand.title} />
          <aside className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-3 text-sm">
            <DetailLine label="Payment" value={formatPaymentStatus(stand.paymentStatus)} />
            <DetailLine label="Type" value={formatKind(stand.kind)} />
            <DetailLine label="Business" value={stand.businessName ?? "-"} />
            {stand.logoUrl ? <DetailLink label="Logo" href={stand.logoUrl} /> : null}
            {stand.destinationUrl ? <DetailLink label="Destination" href={stand.destinationUrl} /> : null}
            {stand.qrTargetUrl && stand.qrTargetUrl !== stand.destinationUrl ? <DetailLink label="QR target" href={stand.qrTargetUrl} /> : null}
            {stand.nfcTargetUrl && stand.nfcTargetUrl !== stand.destinationUrl ? <DetailLink label="NFC target" href={stand.nfcTargetUrl} /> : null}
          </aside>
        </div>
        )}
      </div>
    </ModalDialog>
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

function formatPaymentStatus(status?: string) {
  if (status === "manual_unpaid") return "Payment pending review";
  if (!status || status === "unpaid" || status === "pending_payment") return "Payment pending";
  return status.replaceAll("_", " ");
}
