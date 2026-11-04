'use client';

import {useEffect,useMemo,useState} from 'react';
import {useRouter} from 'next/navigation';
import {AdminAlert,AdminBadge,AdminButton,AdminDataTable,AdminSelect,AdminSummaryCard} from './admin-ui';
import type {WorkerHealthData} from '@/lib/admin-worker-health';

const delays=[5,20,60,120,360,1440] as const;
const date=(value:unknown)=>value?new Date(String(value)).toLocaleString('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):'—';
const count=(value:unknown)=>Number(value||0);

export function ReviewOperations({data}:{data:WorkerHealthData}){
 const router=useRouter();
 const [search,setSearch]=useState('');
 const [drafts,setDrafts]=useState<Record<string,string>>({});
 const [busy,setBusy]=useState<string|null>(null);
 const [messages,setMessages]=useState<Record<string,{text:string;error?:boolean}>>({});
 useEffect(()=>{const timer=setInterval(()=>router.refresh(),60000);return()=>clearInterval(timer);},[router]);
 useEffect(()=>{setDrafts(current=>{const next={...current};for(const l of data.locations)if(!(l.id in next))next[l.id]=String(l.reply_delay_minutes||20);return next;});},[data.locations]);
 const locations=useMemo(()=>data.locations.filter(l=>(l.enabled||l.review_total!=null||count(l.imported)>0)&&`${l.name} ${l.google_email||''} ${l.customer_id}`.toLowerCase().includes(search.toLowerCase())),[data.locations,search]);
 const sum=(field:keyof WorkerHealthData['locations'][number])=>locations.reduce((total,l)=>total+count(l[field]),0);
 const save=async(l:WorkerHealthData['locations'][number])=>{
  setBusy(l.id);setMessages(current=>({...current,[l.id]:{text:''}}));
  try{
   const response=await fetch('/api/admin/review-operations',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({businessId:l.id,delayMinutes:Number(drafts[l.id])})});
   const result=await response.json();if(!response.ok)throw new Error(result.error||'Could not save reply timing.');
   setMessages(current=>({...current,[l.id]:{text:`Timing saved. ${result.rescheduled} scheduled ${result.rescheduled===1?'reply was':'replies were'} recalculated.`}}));router.refresh();
  }catch(error){setMessages(current=>({...current,[l.id]:{text:error instanceof Error?error.message:'Could not save reply timing.',error:true}}));}
  finally{setBusy(null);}
 };
 const statusTone=(l:WorkerHealthData['locations'][number])=>l.status==='Needs attention'?'warning':l.publishEligible?'success':'neutral';
 return <section className="tr-admin-section">
  <header className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="tr-admin-title">Review Operations</h1><p className="mt-1 max-w-3xl text-sm text-muted">Monitor Google review replies by location, spot queue and worker issues, and change the automatic reply delay. Data refreshes every minute.</p></div><AdminButton onClick={()=>router.refresh()}>Refresh now</AdminButton></header>
  <div className="my-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
   <AdminSummaryCard label="Active locations" value={String(locations.length)} description="Connected and licensed"/>
   <AdminSummaryCard label="4–5 star replies on Google" value={`${sum('positive_answered')} / ${sum('positive_total')}`} description="All replies currently present on Google"/>
   <AdminSummaryCard label="Published by Tap Rater" value={String(sum('positive_taprater_replied'))} description="Confirmed from Tap Rater publish records"/>
   <AdminSummaryCard label="Already replied at activation" value={String(sum('positive_preexisting_replied'))} description="Google update time was before automatic replies were enabled"/>
   <AdminSummaryCard label="Waiting for drafts" value={String(sum('waiting'))} description="Eligible historical reviews without a draft"/>
   <AdminSummaryCard label="Scheduled to Google" value={String(sum('queued'))} description="Replies waiting for their scheduled publish time"/>
  </div>
  <div className="tr-admin-card mb-4 p-4"><div className="flex flex-wrap items-end justify-between gap-3"><label className="grid min-w-64 gap-2 text-sm font-semibold text-ink">Find a location<input className="tr-input min-h-10 px-3 py-2 font-normal" placeholder="Business, Google account, or ID" value={search} onChange={e=>setSearch(e.target.value)}/></label><p className="max-w-xl text-xs leading-5 text-muted">“Waiting” means no automatic draft has been generated yet. “Scheduled” means a reply draft is ready and waiting to publish. Changing timing recalculates scheduled automatic replies for that location.</p></div></div>
  <AdminDataTable caption="Google review location queues" minWidth="1360px" headers={['Client / Location','Health','4–5 star replies & source','Waiting drafts','Scheduled','Next publish','Reply delay','Queue issue']}>
   {locations.map(l=><tr key={l.id} className="border-t align-top"><td className="p-3"><strong>{l.name}</strong><span className="block text-xs text-muted">{l.google_email||'Google account connected'}</span><span className="block text-xs text-muted">{data.accounts.find(a=>a.id===l.customer_id)?.email}</span></td>
    <td className="p-3"><AdminBadge tone={statusTone(l)}>{l.status}</AdminBadge><span className="mt-1 block text-xs text-muted">Worker: {l.draftEligibility}</span></td>
    <td className="p-3 tabular-nums">{count(l.positive_answered)} / {count(l.positive_total)}<span className="block text-xs text-muted">{count(l.positive_total)?Math.round(count(l.positive_answered)*100/count(l.positive_total)):0}% on Google</span><span className="mt-1 block text-xs">Tap Rater: {count(l.positive_taprater_replied)} · Before activation: {count(l.positive_preexisting_replied)}</span>{count(l.positive_other_replied)>0&&<span className="block text-xs text-amber-800">Other / source unclear: {count(l.positive_other_replied)}</span>}</td>
    <td className="p-3 tabular-nums">{count(l.waiting)}</td><td className="p-3 tabular-nums">{count(l.queued)}<span className="block text-xs text-muted">{count(l.manual_drafts)} manual drafts</span></td>
    <td className="p-3 text-xs">{date(l.next_reply)}</td>
    <td className="p-3"><div className="flex min-w-48 gap-2"><AdminSelect aria-label={`Reply delay for ${l.name}`} value={drafts[l.id]||String(l.reply_delay_minutes||20)} onChange={e=>setDrafts(current=>({...current,[l.id]:e.target.value}))}>{delays.map(min=> <option key={min} value={min}>{min<60?`${min} minutes`:min===1440?'24 hours':`${min/60} hours`}</option>)}</AdminSelect><AdminButton disabled={busy!==null||!l.enabled||!l.ai_consent||Number(drafts[l.id])===count(l.reply_delay_minutes)} loading={busy===l.id} onClick={()=>save(l)}>Save</AdminButton></div>{(!l.enabled||!l.ai_consent)&&<p className="mt-1 text-xs text-muted">Enable this location and AI replies to change timing.</p>}{messages[l.id]?.text&&<p role={messages[l.id].error?'alert':'status'} className={`mt-2 text-xs ${messages[l.id].error?'text-red-700':'text-teal-800'}`}>{messages[l.id].text}</p>}</td>
    <td className="max-w-64 p-3 text-xs">{l.draft_error_message||l.reasons.join(' · ')||'No active queue issue'}{l.draft_due_at&&<span className="mt-1 block text-muted">Next draft check: {date(l.draft_due_at)}</span>}</td></tr>)}
   {!locations.length&&<tr><td className="p-4" colSpan={8}>No matching active Google review locations.</td></tr>}
  </AdminDataTable>
  <AdminAlert className="mt-4">Tap Rater’s count requires a confirmed publish record. “Before activation” is based on Google’s review update time relative to automatic reply activation. Replies with a later Google update but no Tap Rater publish record are shown as other / source unclear. Timing changes affect pending scheduled replies; published replies cannot be changed here.</AdminAlert>
 </section>;
}
