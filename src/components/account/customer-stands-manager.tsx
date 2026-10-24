"use client";

import Link from "next/link";
import {StandAssignment} from "./stand-assignment";
import { ExternalLink, Link2, Package, X } from "lucide-react";
import { useId, useState } from "react";
import {CustomerProofReview} from "./customer-proof-review";
import { HostedPageEditor } from "@/components/account/hosted-page-editor";
import { StandPreview } from "@/components/account/stand-preview";
import { ModalDialog } from "@/components/ui/modal-dialog";
import type { CustomerPortalStand } from "@/lib/customer-portal";
import type { HostedPageEditorRecord } from "@/lib/hosted-page-editor-shared";
import { formatOrderReference } from "@/lib/order-reference";

export function CustomerStandsManager({
  stands,
  businesses = [],
  hostedPages = {}
}: {
  stands: CustomerPortalStand[];
  hostedPages?: Record<string, HostedPageEditorRecord>;
  businesses?: {id:string;name:string}[];
}) {
  const [assignment,setAssignment]=useState<CustomerPortalStand|null>(null);
  const [selectedStand, setSelectedStand] = useState<CustomerPortalStand | null>(null);
  const [proofOpen,setProofOpen]=useState(false);
  const [showStandPreview, setShowStandPreview] = useState(false);
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("all");
  const visible = stands.filter(stand => (kind === "all" || stand.kind === kind) && `${stand.standLabel??""} ${stand.assignedBusinessName??""} ${stand.standId??""} ${stand.title} ${stand.businessName ?? ""} ${formatOrderReference(stand.orderReference)}`.toLowerCase().includes(search.toLowerCase()));

  if (!stands.length) {
    return <EmptyState message="No stands are linked to this account yet." />;
  }

  return (
    <>
      {stands.length > 1 && <div className="flex flex-wrap gap-3">
        <input className="tr-input flex-1" aria-label="Search stands" placeholder="Search stands" value={search} onChange={e=>setSearch(e.target.value)} />
        <select className="tr-input w-auto" aria-label="Stand type" value={kind} onChange={e=>setKind(e.target.value)}><option value="all">All types</option><option value="standard">Standard</option><option value="multilink">Multi-Link</option><option value="branded">Branded</option><option value="custom">Custom</option></select>
      </div>}
      <section className="grid gap-3">
        {!visible.length && <EmptyState message="No matching stands." />}
        {visible.map((stand) => (
          <StandCard key={stand.id} stand={stand} onAssign={()=>setAssignment(stand)} hasHostedPage={Boolean(hostedPages[stand.id])}
            onOpen={(preview = false, proof = false) => { setProofOpen(proof);setShowStandPreview(preview); setSelectedStand(stand); }} />
        ))}
      </section>
      {assignment&&<StandAssignment stand={assignment} businesses={businesses} onClose={()=>setAssignment(null)}/>}
      {selectedStand ? <StandDetailModal stand={selectedStand} hostedPage={hostedPages[selectedStand.id]} proofOpen={proofOpen} showStandPreview={showStandPreview} onClose={() => setSelectedStand(null)} /> : null}
    </>
  );
}

function StandCard({ stand, hasHostedPage, onOpen, onAssign }: { onAssign:()=>void; stand: CustomerPortalStand; hasHostedPage: boolean; onOpen: (preview?: boolean, proof?:boolean) => void }) {
  const isMultiLink = stand.kind === "multilink";
  const historyOnly = isMultiLink && !hasHostedPage && !stand.hostedPageCode && !stand.hostedPageUrl && !stand.multiLinkSetupPending;

  return (
    <article className="rounded-md border border-line bg-white p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <StandThumbnail stand={stand} />
          <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-medium text-ink">{stand.standLabel||stand.title}</h3>
            {stand.quantity > 1 ? <span className="rounded-full bg-soft px-2 py-1 text-xs text-muted">Qty {stand.quantity}</span> : null}
            <span className="rounded-full bg-teal-50 px-2 py-1 text-xs font-medium text-brand">{formatKind(stand.kind)}</span>
            {stand.orderId && <span className="rounded-full bg-soft px-2 py-1 text-xs capitalize text-muted">{formatPaymentStatus(stand.paymentStatus)}</span>}
          </div>
          {stand.assignmentVersion? <p className="mt-2 text-xs text-brand">{stand.assignedBusinessName||"Unassigned"} - Assignment draft</p>:null}
          {stand.deviceCode&&<p className="mt-1 text-xs text-muted">Device {stand.deviceCode}</p>}
          {stand.standId&&<p className="mt-2 break-all font-mono text-[11px] text-muted">{stand.standId}</p>}
          <p className="mt-2 max-w-full break-all text-sm text-muted">
            {stand.businessName ? `${stand.businessName} - ` : ""}{stand.orderId ? `Order ${formatOrderReference(stand.orderReference)}` : stand.deviceCode ? "Registered stand" : "Multi-Link"}
          </p>
          {stand.orderId && <p className="mt-2 text-xs capitalize text-muted">{stand.shippingStatus === "not_shipped" ? stand.productionStatus.replaceAll("_", " ") : stand.shippingStatus.replaceAll("_", " ")}</p>}
          {isMultiLink && stand.hostedPageUrl ? (
            <a href={stand.hostedPageUrl} target="_blank" rel="noreferrer" className="mt-3 block break-all text-sm text-brand">
              {stand.hostedPageUrl}
            </a>
          ) : null}
        </div>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          {stand.registryId&&<button className="tr-button-ghost" onClick={onAssign}>Assign business</button>}
          {stand.proofAvailable&&<button className="tr-button-ghost" onClick={()=>onOpen(false,true)}>{stand.proofReviewAvailable?"Review proof":"View proof"}</button>}
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

function StandThumbnail({stand}: {stand: CustomerPortalStand}) {
  const [failed, setFailed] = useState<string[]>([]);
  const source = [stand.proofPreviewUrl, stand.productImageUrl].find((url): url is string => Boolean(url) && !failed.includes(url!));
  return <div className="flex h-20 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line bg-white p-1">
    {source ? <img src={source} alt={`${stand.title} image`} width={64} height={80} loading="lazy" className="h-full w-full object-contain" onError={()=>setFailed(previous=>[...previous, source])} />
      : stand.kind === "multilink" ? <Link2 size={22} className="text-muted" aria-label="Multi-Link page"/> : <Package size={22} className="text-muted" aria-label="Stand"/>}
  </div>;
}

function StandDetailModal({
  stand,
  hostedPage,
  showStandPreview,
  proofOpen,
  onClose
}: {
  stand: CustomerPortalStand;
  hostedPage?: HostedPageEditorRecord;
  showStandPreview: boolean;
  proofOpen:boolean;
  onClose: () => void;
}) {
  const [dirty,setDirty]=useState(false),[busy,setBusy]=useState(false),[confirmClose,setConfirmClose]=useState(false);
  function requestClose(){if(busy)return;if(dirty){setConfirmClose(true);return;}onClose();}
  const isMultiLink = stand.kind === "multilink" && !showStandPreview;
  const headingId = useId();
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  return (
    <ModalDialog labelledBy={headingId} onClose={requestClose} className="px-3 py-2">
      <div className={`flex max-h-[calc(100dvh-1rem)] w-full min-w-0 flex-col rounded-lg bg-white shadow-2xl ${isMultiLink ? "max-w-[92rem] overflow-hidden" : "max-w-4xl overflow-y-auto"}`}>
        <div className="flex items-center justify-between gap-4 border-b border-line px-4 py-2">
          <div className="min-w-0">
            <p className="tr-eyebrow">{isMultiLink && hostedPage ? "Multi-Link page" : "Stand details"}</p>
            <h2 id={headingId} tabIndex={-1} data-dialog-heading className="mt-1 break-words text-base font-medium text-ink focus:outline-none">{stand.title}</h2>
          </div>
          <div className="flex shrink-0 items-center gap-2"><Link href="/account/orders" onClick={event=>{if(dirty||busy){event.preventDefault();if(dirty)setConfirmClose(true);}else onClose();}} className="tr-button-ghost">Orders &amp; Billing</Link>
          <button type="button" onClick={requestClose} disabled={busy} className="tr-icon-button shrink-0" aria-label="Close stand details">
            <X size={18} />
          </button></div>
        </div>
        {proofOpen ? <CustomerProofReview orderId={stand.orderId} index={stand.lineItemIndex} canApprove={Boolean(stand.proofReviewAvailable)} onDone={onClose} onBusyChange={setBusy}/> : isMultiLink ? (
          <div className="min-h-0 overflow-hidden p-3">
            {hostedPage ? (
              <HostedPageEditor initialPage={hostedPage} onDirtyChange={setDirty} onBusyChange={setBusy} />
            ) : (
              <EmptyState message={stand.multiLinkSetupPending
                ? "Payment is confirmed. Your Multi-Link page is being prepared."
                : "The page editor is unavailable. Contact support if you need help accessing this page."} />
            )}
          </div>
        ) : (
        <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_300px]">
          <StandPreview key={stand.id} url={stand.proofPreviewUrl || stand.productImageUrl} title={stand.title} />
          <aside className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-3 text-sm">
            {stand.standId&&<DetailLine label="Stand ID" value={stand.standId}/>}
            {stand.orderId&&<DetailLine label="Payment" value={formatPaymentStatus(stand.paymentStatus)} />}
            <DetailLine label="Type" value={formatKind(stand.kind)} />
            {stand.businessName && <DetailLine label="Business" value={stand.businessName} />}
            <DetailLine label={stand.deviceCode?"Device status":"Production"} value={stand.productionStatus.replaceAll("_", " ")} />
            {stand.shippingStatus&&<DetailLine label="Delivery" value={stand.shippingStatus.replaceAll("_", " ")} />}
            {stand.proofStatus !== "not_needed" && <DetailLine label="Design" value={stand.proofStatus === "approved" ? "Approved" : stand.proofAvailable ? "Awaiting review" : "Design being prepared"} />}
            {stand.trackingNumber && <DetailLine label={stand.shippingCarrier || "Tracking number"} value={stand.trackingNumber} />}
            {stand.trackingUrl && <DetailLink label="Track delivery" href={stand.trackingUrl} />}
            {stand.destinationUrl && <button className="tr-button-ghost" onClick={async()=>{try{await navigator.clipboard.writeText(stand.destinationUrl!);setCopied(true);setCopyError(false);}catch{setCopyError(true);}}}>{copied ? "Link copied" : "Copy destination link"}</button>}
            {copyError && <p role="status">Copy unavailable. Open the destination link below.</p>}

            {stand.logoUrl ? <DetailLink label="Logo" href={stand.logoUrl} /> : null}
            {stand.destinationUrl ? <DetailLink label="Destination" href={stand.destinationUrl} /> : null}
            {stand.qrTargetUrl && stand.qrTargetUrl !== stand.destinationUrl ? <DetailLink label="QR target" href={stand.qrTargetUrl} /> : null}
            {stand.nfcTargetUrl && stand.nfcTargetUrl !== stand.destinationUrl ? <DetailLink label="NFC target" href={stand.nfcTargetUrl} /> : null}
          </aside>
        </div>
        )}
      </div>
      {confirmClose&&<ModalDialog labelledBy="unsaved-links-title" onClose={()=>setConfirmClose(false)}><div className="tr-card w-[min(440px,calc(100vw-32px))] p-5"><h2 id="unsaved-links-title" data-dialog-heading tabIndex={-1} className="text-lg font-semibold">Discard unsaved edits?</h2><p className="my-4 text-sm text-muted">Your saved draft and live page will stay unchanged.</p><div className="flex justify-end gap-2"><button className="tr-button-ghost" onClick={()=>setConfirmClose(false)}>Keep editing</button><button className="tr-button-primary" onClick={onClose}>Discard edits</button></div></div></ModalDialog>}
    </ModalDialog>
  );
}

function DetailLine({ label, value }: { label: string; value: string }) {
  return (
    <p className="rounded-md bg-soft px-3 py-2">
      <span className="block text-xs text-muted">{label}</span>
      <span className={`mt-1 block break-words text-ink ${label==='Stand ID'?'font-mono text-xs normal-case':'capitalize'}`}>{value}</span>
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
