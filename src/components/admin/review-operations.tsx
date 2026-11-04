'use client';

import {useEffect,useMemo,useState} from 'react';
import {useRouter} from 'next/navigation';
import {CircleAlert,CircleCheck,CircleX,ChevronRight} from 'lucide-react';
import {AdminAlert,AdminButton,AdminSummaryCard} from './admin-ui';
import type {WorkerHealthData} from '@/lib/admin-worker-health';
import {ReviewLocationPanel} from './review-location-panel';

const count=(value:unknown)=>Number(value||0);

export function ReviewOperations({data}:{data:WorkerHealthData}){
 const router=useRouter();
 const [search,setSearch]=useState('');
 const [selected,setSelected]=useState<WorkerHealthData['locations'][number]|null>(null);
 useEffect(()=>{const timer=setInterval(()=>router.refresh(),60000);return()=>clearInterval(timer);},[router]);
 useEffect(()=>{setSelected(current=>current?data.locations.find(l=>l.id===current.id)||current:null);},[data.locations]);
 const locations=useMemo(()=>data.locations.filter(l=>(l.enabled||l.review_total!=null||count(l.imported)>0)&&`${l.name} ${l.google_email||''} ${l.customer_id}`.toLowerCase().includes(search.toLowerCase())),[data.locations,search]);
 const sum=(field:keyof WorkerHealthData['locations'][number])=>locations.reduce((total,l)=>total+count(l[field]),0);
 const status=(l:WorkerHealthData['locations'][number])=>{
  const broken=!l.enabled||!l.connected||l.licensed===false||Boolean(l.import_error)||Boolean(l.draft_error)||count(l.uncertain)>0||count(l.failed_publish)>0||count(l.alerts)>0;
  if(broken)return {label:'Error',Icon:CircleX,color:'text-red-600',surface:'border-red-200 bg-red-50/50'};
  if(l.status==='Needs attention'||!l.publishEligible||count(l.waiting)>0)return {label:'Attention',Icon:CircleAlert,color:'text-amber-600',surface:'border-amber-200 bg-amber-50/40'};
  return {label:'Healthy',Icon:CircleCheck,color:'text-emerald-600',surface:'border-emerald-200 bg-emerald-50/40'};
 };
 return <section className="tr-admin-section">
  <header className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="tr-admin-title">Review Operations</h1><p className="mt-1 max-w-3xl text-sm text-muted">Monitor each Google Reviews queue, change reply settings, and open any location to diagnose or recover it. Data refreshes every minute.</p></div><AdminButton onClick={()=>router.refresh()}>Refresh now</AdminButton></header>
  <div className="my-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
   <AdminSummaryCard label="Active locations" value={String(locations.length)} description="Connected and licensed"/>
   <AdminSummaryCard label="4–5 star replies on Google" value={`${sum('positive_answered')} / ${sum('positive_total')}`} description="All replies currently present on Google"/>
   <AdminSummaryCard label="Published by Tap Rater" value={String(sum('positive_taprater_replied'))} description="Confirmed from Tap Rater publish records"/>
   <AdminSummaryCard label="Already replied at activation" value={String(sum('positive_preexisting_replied'))} description="Google update time was before automatic replies were enabled"/>
   <AdminSummaryCard label="Waiting for drafts" value={String(sum('waiting'))} description="Eligible historical reviews without a draft"/>
   <AdminSummaryCard label="Scheduled to Google" value={String(sum('queued'))} description="Replies waiting for their scheduled publish time"/>
   <AdminSummaryCard label="Known publish failures" value={String(sum('failed_publish'))} description="Eligible retries shown in the location repair panel"/>
   <AdminSummaryCard label="Google result checks" value={String(sum('uncertain'))} description="Needs a status check before any retry"/>
  </div>
  <div className="tr-admin-card mb-4 p-4"><div className="flex flex-wrap items-end justify-between gap-3"><label className="grid min-w-64 gap-2 text-sm font-semibold text-ink">Find a location<input className="tr-input min-h-10 px-3 py-2 font-normal" placeholder="Business, Google account, or ID" value={search} onChange={e=>setSearch(e.target.value)}/></label><p className="max-w-xl text-xs leading-5 text-muted">“Waiting” means a reply draft has not been generated. “Scheduled” means a draft is ready and waiting to publish. Open a location to adjust settings, retry a safe failure, or check Google’s result.</p></div></div>
  <section role="list" aria-label="Google review locations" className="grid gap-2">
   {locations.map(l=>{const state=status(l),Icon=state.Icon;const clientEmail=String(data.accounts.find(a=>a.id===l.customer_id)?.email||'');return <button type="button" role="listitem" key={l.id} onClick={()=>setSelected(l)} aria-label={`Open ${l.name} review details. Status: ${state.label}.`} className={`w-full rounded-xl border p-3 text-left shadow-sm transition hover:border-brand/40 hover:shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand sm:p-4 ${state.surface}`}>
    <span className="flex min-w-0 items-center gap-3"><Icon aria-hidden="true" className={`h-6 w-6 shrink-0 ${state.color}`} strokeWidth={2.2}/><span className="min-w-0 flex-1"><span className="block truncate font-semibold text-ink" title={l.name}>{l.name}</span><span className="mt-0.5 block truncate text-xs text-muted">{clientEmail||l.google_email||'Google Reviews location'}{clientEmail&&l.google_email?` · Google: ${l.google_email}`:''}</span></span><span className={`hidden shrink-0 rounded-full bg-white/80 px-2.5 py-1 text-xs font-semibold sm:inline-flex ${state.color}`}>{state.label}</span><ChevronRight aria-hidden="true" className="h-5 w-5 shrink-0 text-muted"/></span>
    <span className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-slate-200/70 pt-3 text-xs sm:grid-cols-4"><span><span className="block text-muted">4–5 star replies</span><strong className="mt-0.5 block text-sm tabular-nums text-ink">{count(l.positive_answered)} / {count(l.positive_total)}</strong></span><span><span className="block text-muted">Waiting for draft</span><strong className="mt-0.5 block text-sm tabular-nums text-ink">{count(l.waiting)}</strong></span><span><span className="block text-muted">Scheduled</span><strong className="mt-0.5 block text-sm tabular-nums text-ink">{count(l.queued)}</strong></span><span><span className="block text-muted">Failed / verify</span><strong className={`mt-0.5 block text-sm tabular-nums ${count(l.failed_publish)+count(l.uncertain)>0?'text-red-700':'text-ink'}`}>{count(l.failed_publish)} / {count(l.uncertain)}</strong></span></span>
    {(state.label!=='Healthy'||l.draft_error_message||l.reasons?.length>0)&&<span className={`mt-3 block truncate border-t border-slate-200/70 pt-2 text-xs ${state.label==='Error'?'text-red-700':state.label==='Attention'?'text-amber-800':'text-muted'}`} title={l.draft_error_message||l.reasons.join(' · ')}>{l.draft_error_message||l.reasons.join(' · ')||'Review queue needs attention'}</span>}
   </button>;})}
   {!locations.length&&<p className="rounded-lg border border-line bg-white p-4 text-sm text-muted">No matching Google review locations.</p>}
  </section>
  <AdminAlert className="mt-4">Tap Rater’s count requires a confirmed publish record. “Before activation” is based on Google’s review update time relative to automatic reply activation. Replies with a later Google update but no Tap Rater publish record are shown as other / source unclear. Changes affect eligible pending replies; published replies cannot be changed here.</AdminAlert>
  {selected&&<ReviewLocationPanel key={selected.id+':'+selected.settings_version+':'+selected.reply_delay_minutes} location={selected} clientEmail={String(data.accounts.find(a=>a.id===selected.customer_id)?.email||'')} onClose={()=>setSelected(null)} onSaved={()=>router.refresh()}/>}
 </section>;
}
