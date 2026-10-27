"use client";
import Link from 'next/link';
import {useId,useState} from 'react';
import {X} from 'lucide-react';
import {ModalDialog} from '@/components/ui/modal-dialog';
import type {CustomerPortalStand} from '@/lib/customer-portal';
import type {HostedPageEditorRecord} from '@/lib/hosted-page-editor-shared';
import {formatOrderReference} from '@/lib/order-reference';
import {CustomerProofReview} from './customer-proof-review';
import {HostedPageEditor} from './hosted-page-editor';
import {StandPreview} from './stand-preview';
import {DetailLine,DetailLink,EmptyState,formatKind,formatPaymentStatus} from './stand-management-display';
export function StandDetailModal({
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
          <div className="min-h-0 overflow-y-auto p-3">
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
            {stand.orderId&&<DetailLine label="Order" value={formatOrderReference(stand.orderReference)}/>}
            {stand.deviceCode&&<DetailLine label="Device" value={stand.deviceCode}/>}
            {stand.businessName&&<DetailLine label="Business" value={stand.businessName}/>}
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
