"use client";
import Link from 'next/link';
import {useState} from 'react';
import {Link2,Package} from 'lucide-react';
import type {CustomerPortalStand} from '@/lib/customer-portal';
import {activateListRow} from './list-row-action';
import {formatKind,formatPaymentStatus} from './stand-management-display';
export function StandCard({ stand, hasHostedPage, onOpen, onAssign }: { onAssign:()=>void; stand: CustomerPortalStand; hasHostedPage: boolean; onOpen: (preview?: boolean, proof?:boolean) => void }) {
  const isMultiLink = stand.kind === "multilink";
  const historyOnly = isMultiLink && !hasHostedPage && !stand.hostedPageCode && !stand.hostedPageUrl && !stand.multiLinkSetupPending;

  return (
    <article data-dashboard-row onClick={event=>activateListRow(event,()=>onOpen(true))} className="tr-stand-row rounded-md border border-line bg-white p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <StandThumbnail stand={stand} />
          <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-medium text-ink"><button type="button" className="text-left hover:underline" aria-haspopup="dialog" aria-label={`Open details for ${stand.standLabel||stand.title}`} onClick={()=>onOpen(true)}>{stand.standLabel||stand.title}</button></h3>
            {stand.quantity > 1 ? <span className="rounded-full bg-soft px-2 py-1 text-xs text-muted">Qty {stand.quantity}</span> : null}
            <span className="rounded-full bg-teal-50 px-2 py-1 text-xs font-medium text-brand">{formatKind(stand.kind)}</span>
            {stand.orderId && <span className="rounded-full bg-soft px-2 py-1 text-xs capitalize text-muted">{formatPaymentStatus(stand.paymentStatus)}</span>}
            {stand.assignmentVersion ? <span className="text-xs text-brand">{stand.assignedBusinessName||"Unassigned"} - Assignment draft</span> : null}
            {isMultiLink && stand.hostedPageUrl ? (
              <a href={stand.hostedPageUrl} target="_blank" rel="noreferrer" className="min-w-0 break-all text-xs text-brand">
                {stand.hostedPageUrl}
              </a>
            ) : null}
          </div>
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
  return <div className="tr-stand-thumbnail flex h-20 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line bg-white p-1">
    {source ? <img src={source} alt={`${stand.title} image`} width={64} height={80} loading="lazy" className="h-full w-full object-contain" onError={()=>setFailed(previous=>[...previous, source])} />
      : stand.kind === "multilink" ? <Link2 size={22} className="text-muted" aria-label="Multi-Link page"/> : <Package size={22} className="text-muted" aria-label="Stand"/>}
  </div>;
}
