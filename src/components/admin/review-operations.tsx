'use client';

import {useEffect,useMemo,useState} from 'react';
import {useRouter} from 'next/navigation';
import {AdminAlert,AdminBadge,AdminButton,AdminDataTable,AdminSummaryCard} from './admin-ui';
import type {WorkerHealthData} from '@/lib/admin-worker-health';
import {ReviewLocationPanel} from './review-location-panel';

const date=(value:unknown)=>value?new Date(String(value)).toLocaleString('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):'—';
const count=(value:unknown)=>Number(value||0);

export function ReviewOperations({data}:{data:WorkerHealthData}){
 const router=useRouter();
 const [search,setSearch]=useState('');
 const [selected,setSelected]=useState<WorkerHealthData['locations'][number]|null>(null);
 useEffect(()=>{const timer=setInterval(()=>router.refresh(),60000);return()=>clearInterval(timer);},[router]);
 useEffect(()=>{setSelected(current=>current?data.locations.find(l=>l.id===current.id)||current:null);},[data.locations]);
 const locations=useMemo(()=>data.locations.filter(l=>(l.enabled||l.review_total!=null||count(l.imported)>0)&&`${l.name} ${l.google_email||''} ${l.customer_id}`.toLowerCase().includes(search.toLowerCase())),[data.locations,search]);
 const sum=(field:keyof WorkerHealthData['locations'][number])=>locations.reduce((total,l)=>total+count(l[field]),0);
 const statusTone=(l:WorkerHealthData['locations'][number])=>l.status==='Needs attention'?'warning':l.publishEligible?'success':'neutral';
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
  <AdminDataTable caption="Google review location queues" minWidth="1360px" headers={['Client / Location','Health','4–5 star replies & source','Waiting drafts','Scheduled','Failed / verify','Next publish','Reply delay','Queue issue']}>
   {locations.map(l=><tr key={l.id} className="border-t align-top"><td className="p-3"><button type="button" className="text-left font-semibold text-brand underline decoration-transparent underline-offset-2 hover:decoration-current" onClick={()=>setSelected(l)}>{l.name}</button><span className="block text-xs text-muted">{l.google_email||'Google account connected'}</span><span className="block text-xs text-muted">{data.accounts.find(a=>a.id===l.customer_id)?.email}</span><span className="mt-1 block text-xs text-brand">Open controls & fix issues →</span></td>
    <td className="p-3"><AdminBadge tone={statusTone(l)}>{l.status}</AdminBadge><span className="mt-1 block text-xs text-muted">Worker: {l.draftEligibility}</span></td>
    <td className="p-3 tabular-nums">{count(l.positive_answered)} / {count(l.positive_total)}<span className="block text-xs text-muted">{count(l.positive_total)?Math.round(count(l.positive_answered)*100/count(l.positive_total)):0}% on Google</span><span className="mt-1 block text-xs">Tap Rater: {count(l.positive_taprater_replied)} · Before activation: {count(l.positive_preexisting_replied)}</span>{count(l.positive_other_replied)>0&&<span className="block text-xs text-amber-800">Other / source unclear: {count(l.positive_other_replied)}</span>}</td>
    <td className="p-3 tabular-nums">{count(l.waiting)}<span className="block text-xs text-muted">waiting for AI draft</span></td><td className="p-3 tabular-nums">{count(l.queued)}<span className="block text-xs text-muted">{count(l.manual_drafts)} manual drafts</span></td>
    <td className="p-3 tabular-nums">{count(l.failed_publish)} failed<span className="block text-xs text-muted">{count(l.uncertain)} need Google check</span></td><td className="p-3 text-xs">{date(l.next_reply)}</td>
    <td className="p-3">{count(l.reply_delay_minutes)} min<button type="button" className="ml-2 text-xs font-semibold text-brand underline" onClick={()=>setSelected(l)}>Adjust</button></td>
    <td className="max-w-64 p-3 text-xs">{l.draft_error_message||l.reasons.join(' · ')||'No active queue issue'}{l.draft_due_at&&<span className="mt-1 block text-muted">Next draft check: {date(l.draft_due_at)}</span>}</td></tr>)}
   {!locations.length&&<tr><td className="p-4" colSpan={9}>No matching active Google review locations.</td></tr>}
  </AdminDataTable>
  <AdminAlert className="mt-4">Tap Rater’s count requires a confirmed publish record. “Before activation” is based on Google’s review update time relative to automatic reply activation. Replies with a later Google update but no Tap Rater publish record are shown as other / source unclear. Changes affect eligible pending replies; published replies cannot be changed here.</AdminAlert>
  {selected&&<ReviewLocationPanel key={selected.id+':'+selected.settings_version+':'+selected.reply_delay_minutes} location={selected} clientEmail={String(data.accounts.find(a=>a.id===selected.customer_id)?.email||'')} onClose={()=>setSelected(null)} onSaved={()=>router.refresh()}/>}
 </section>;
}
