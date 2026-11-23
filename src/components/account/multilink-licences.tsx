"use client";
import Link from 'next/link';
import {useId,useState} from 'react';
import {Check,Circle,Copy,ExternalLink,Link2,Pencil} from 'lucide-react';
import type {MultiLinkLicence} from './multilink-licence-model';
import type {Selection} from './billing-model';
import {BillingDetailsDialog} from './billing-details-dialog';
import {StandDetailModal} from './stand-management-dialog';
import {EmptyState} from './stand-management-display';

export function MultiLinkLicences({licences}:{licences:MultiLinkLicence[]}){
  const [editing,setEditing]=useState<MultiLinkLicence|null>(null);
  const [billing,setBilling]=useState<Selection|null>(null);
  const headingId=useId();
  if(!licences.length)return <EmptyState message="You don’t have a Multi-Link licence yet."/>;
  const live=licences.filter(licence=>licence.status.label==='Live').length;
  return <>
    <p className="text-sm text-muted">{licences.length} licence{licences.length===1?'':'s'} · {live} live. Each licence is one page that your stand opens.</p>
    <section aria-label="Multi-Link licences" className="grid grid-cols-[minmax(0,1fr)] gap-4">
      {licences.map(licence=><LicenceCard key={licence.code} licence={licence} onEdit={()=>setEditing(licence)} onBilling={()=>setBilling({kind:'subscription',value:licence.subscription})}/>)}
    </section>
    {editing&&<StandDetailModal stand={editing.editorStand} hostedPage={editing.page} proofOpen={false} showStandPreview={false} onClose={()=>setEditing(null)}/>}
    {billing&&<BillingDetailsDialog selected={billing} setSelected={setBilling} headingId={headingId} invoices={[]}/>}
  </>;
}

function LicenceCard({licence,onEdit,onBilling}:{licence:MultiLinkLicence;onEdit:()=>void;onBilling:()=>void}){
  const [copied,setCopied]=useState(false);
  const stand=licence.linkedStands[0];
  const standImage=stand?.proofPreviewUrl||stand?.productImageUrl||licence.grantedStand?.imageUrl;
  const standTitle=stand?(licence.linkedStands.length>1?`${licence.linkedStands.length} stands`:stand.standLabel||stand.title):licence.grantedStand?.title;
  const next=licence.steps.find(step=>!step.done);
  const published=licence.steps[1]?.done;
  async function copy(){try{await navigator.clipboard.writeText(licence.subscription.hostedPageUrl);setCopied(true);}catch{setCopied(false);}}
  return <article className="tr-card grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4 p-4 sm:p-5" aria-label={`${licence.name} Multi-Link licence`}>
    <header className="flex flex-wrap items-start gap-3">
      <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg border border-line bg-white">
        {licence.logoUrl?<img src={licence.logoUrl} alt="" className="h-full w-full object-contain"/>:<Link2 size={20} className="text-muted" aria-hidden="true"/>}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="break-words text-base font-semibold text-ink">{licence.name}{licence.heading&&<span className="font-normal text-muted"> — {licence.heading}</span>}</h3>
        <p className="mt-1 text-xs text-muted">{licence.plan}</p>
      </div>
      <span className={`tr-badge ${licence.status.tone}`}>{licence.status.label}</span>
    </header>

    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-soft p-3">
      <div className="grid h-14 w-12 shrink-0 place-items-center overflow-hidden rounded-md border border-line bg-white p-1">
        {standImage?<img src={standImage} alt="" className="h-full w-full object-contain" loading="lazy"/>:<Link2 size={18} className="text-muted" aria-hidden="true"/>}
      </div>
      <div className="min-w-0 flex-1 basis-40 text-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Stand</p>
        {standTitle?<p className="truncate font-medium text-ink">{standTitle}</p>:<p className="text-ink">No stand opens this page yet</p>}
        <p className="truncate text-xs text-muted">Opens {licence.subscription.hostedPageUrl.replace(/^https?:\/\//,'')}</p>
      </div>
      {stand?<Link href="/account/stands" className="tr-button-ghost shrink-0 text-sm">View stand</Link>
        :<button type="button" className="tr-button-ghost shrink-0 text-sm" onClick={copy}><Copy size={14} aria-hidden="true"/>{copied?'Copied':'Copy link'}</button>}
    </div>

    <ol className="grid gap-2 text-sm sm:grid-cols-3" aria-label="Setup steps">
      {licence.steps.map((step,index)=><li key={step.label} className={`flex items-start gap-2 rounded-lg border p-2.5 ${step===next?'border-brand bg-white':'border-line'}`}>
        <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full ${step.done?'bg-brand text-white':'border border-line text-muted'}`}>{step.done?<Check size={12} aria-hidden="true"/>:<Circle size={8} aria-hidden="true"/>}</span>
        <span className="min-w-0"><span className="block font-medium text-ink">{index+1}. {step.label}</span><span className="block text-xs text-muted">{step.done?'Done · ':''}{step.detail}</span></span>
      </li>)}
    </ol>

    <footer className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
      {licence.page?<button type="button" className="tr-button-primary" onClick={onEdit}><Pencil size={15} aria-hidden="true"/>{published?'Edit links':licence.steps[0]?.done?'Review & publish':'Add your links'}</button>
        :<p className="text-sm text-muted">Your page is being prepared.</p>}
      {published&&<a href={licence.subscription.hostedPageUrl} target="_blank" rel="noreferrer" className="tr-button-ghost"><ExternalLink size={15} aria-hidden="true"/>Open page</a>}
      <button type="button" className="tr-button-ghost" onClick={onBilling}>Licence &amp; billing</button>
    </footer>
  </article>;
}
