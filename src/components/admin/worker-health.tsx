'use client';

import {useState,useEffect} from 'react';

import {useRouter} from 'next/navigation';

import {ModalDialog} from '@/components/ui/modal-dialog';
import {AdminBadge,AdminButton,AdminLinkButton,AdminSummaryCard,AdminDataTable} from './admin-ui';

import type {WorkerHealthData} from '@/lib/admin-worker-health';

const date=(v:unknown)=>v?new Date(String(v)).toLocaleString('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):'Not recorded';

const count=(v:unknown)=>Number(v||0);

const on=(v:unknown)=>v?'On':'Off';

function Badge({value}:{value:string}){return <AdminBadge tone={/attention|Failed|Overdue|blocked/i.test(value)?'warning':/Reporting|Running/.test(value)?'success':'neutral'}>{value}</AdminBadge>;}

export function WorkerHealth({data}:{data:WorkerHealthData}){

 const router=useRouter(),[search,setSearch]=useState(''),[selected,setSelected]=useState<string|null>(null);

 useEffect(()=>{const timer=setInterval(()=>router.refresh(),60000);return()=>clearInterval(timer);},[router]);

 const account=data.accounts.find(a=>a.id===selected),locations=data.locations.filter(l=>l.customer_id===selected);

 return <section className="tr-admin-section"><div className="flex items-center justify-between"><div><h1 className="tr-admin-title">Workers & Health</h1><p className="mt-1 text-sm text-muted">Updated {date(data.checkedAt)} ET · Refreshes every minute</p></div><div className="flex items-center gap-2"><AdminLinkButton href="/admin/client-failures">Client failures &amp; support alerts</AdminLinkButton><AdminButton onClick={()=>router.refresh()}>Refresh</AdminButton></div></div>

 <div className="my-4 grid gap-3 md:grid-cols-4">{[
 ['Client accounts',data.accounts.length],['Active locations',data.locations.length],['Import / draft eligible',`${data.locations.filter(l=>l.importEligible).length} / ${data.locations.filter(l=>l.draftEligible).length}`],['Autopilot eligible',data.locations.filter(l=>l.publishEligible).length],
 ].map(([label,value])=><AdminSummaryCard key={label} label={String(label)} value={String(value)}/>)}</div>
 <div className="mt-4"><AdminDataTable caption="Worker schedules and health" headers={['Worker','Schedule','Status','Last started','Last success','Last run']}>{data.workers.map(w=><tr className="border-t" key={w.name}><td className="p-3 font-medium">{w.label}</td><td>Every {w.minutes} min</td><td><Badge value={w.health}/></td><td>{date(w.started_at)}</td><td>{date(w.succeeded_at)}</td><td className="p-3 text-xs">{Object.entries(w.metrics||{}).map(([k,v])=>`${k}: ${v}`).join(' · ')||'—'}{count(w.failures)>0&&` · ${w.failures} failures`}</td></tr>)}</AdminDataTable></div>

 <div className="my-4 grid gap-3 md:grid-cols-3">{[

 ['Heat-map provider',data.integrations.heatmap_provider_enabled?'Enabled':'Disabled'],

 ['Stripe webhook last processed',date(data.integrations.stripe_last_processed)],

 ['Email delivery',`${date(data.integrations.email_last_delivered)} · ${data.integrations.email_failures} failed / bounced in 24h`],

 ].map(([label,value])=><div className="tr-admin-card p-3" key={label}><p className="text-xs text-muted">{label}</p><p className="mt-1 text-sm">{value}</p></div>)}</div>

 <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">Client accounts</h2><input aria-label="Find client or location" className="rounded border p-2 text-sm" placeholder="Find client or location" value={search} onChange={e=>setSearch(e.target.value)}/></div>

 <div className="mt-3"><AdminDataTable caption="Client account health" headers={['Client','Service licence','Locations','Health','Queued / waiting','Actions']}>{data.accounts.filter(a=>`${a.name} ${a.email} ${data.locations.filter(l=>l.customer_id===a.id).map(l=>l.name).join(' ')}`.toLowerCase().includes(search.toLowerCase())).map(a=>{

 const ls=data.locations.filter(l=>l.customer_id===a.id),attention=ls.filter(l=>l.status==='Needs attention').length;

 return <tr className="border-b" key={a.id}><td className="p-3"><strong>{a.name}</strong><div className="text-xs text-muted">{a.email} · {a.account_status}</div></td><td><span>{a.expires_at&&new Date(a.expires_at).getTime()<=Date.now()?'Expired':a.licence_status||'None'}</span><div className="text-xs text-muted">{a.unlimited_locations?'Unlimited locations':`${count(a.location_limit)} locations`}</div></td><td><span>{ls.length}</span>{count(a.removed_locations)>0&&<div className="text-xs text-muted">{a.removed_locations} removed</div>}</td><td><Badge value={attention?`${attention} need attention`:ls.some(l=>l.enabled)?'Reporting':'No connected service'}/>{count(a.email_failures)>0&&<div className="text-xs text-amber-800">Email delivery needs attention</div>}</td><td>{ls.reduce((n,l)=>n+count(l.queued),0)} / {ls.reduce((n,l)=>n+count(l.waiting),0)}</td><td><AdminButton data-admin-row-open onClick={()=>setSelected(a.id)}>View health</AdminButton></td></tr>;

 })}</AdminDataTable></div>

 <p className="mt-3 text-xs text-muted">Reporting confirms recent activity, not an external API health check. Waiting counts older reviews queued for drafting; queued counts scheduled replies. Times are Eastern.</p>

 {account&&<ModalDialog labelledBy="client-health-title" onClose={()=>setSelected(null)}><section className="w-[min(1100px,94vw)] h-[min(780px,90dvh)] overflow-auto rounded-xl bg-white p-5"><header className="flex items-center justify-between"><div><h2 id="client-health-title" data-dialog-heading tabIndex={-1} className="text-xl font-semibold">{account.name}</h2><p className="text-sm text-muted">{account.email}</p></div><button className="tr-button-ghost" aria-label="Close client health" onClick={()=>setSelected(null)}>✕</button></header>

 <div className="my-4 flex flex-wrap gap-5 rounded bg-slate-50 p-3 text-sm"><span>Licence: {account.expires_at&&new Date(account.expires_at).getTime()<=Date.now()?'Expired':account.licence_status||'None'}</span><span>Expires: {account.expires_at?date(account.expires_at):'No expiry recorded'}</span><span>Monthly AI requests: {account.ai_used} · Limit per location: {count(account.ai_monthly_limit)}</span><a className="underline" href="/admin/customers">Manage licences</a><a className="underline" href="/admin/usage">Usage & costs</a></div>

 {!locations.length&&<p>No locations added.</p>}{locations.map(l=><article key={l.id} className="mb-4 rounded border"><div className="flex justify-between bg-slate-50 p-3"><div><h3 className="font-semibold">{l.name}</h3><p className="text-xs text-muted">{l.id}</p></div><Badge value={l.status}/></div>{l.reasons.length>0&&<p className="px-3 pt-3 text-sm text-amber-900">{l.reasons.join(' · ')}</p>}

 <div className="grid gap-4 p-3 text-sm md:grid-cols-3"><div><h4 className="font-semibold">Google & imports</h4><p>Worker: {l.importEligibility}</p><p>Connection: {l.connected?'Stored':'Missing'} · Import: {on(l.enabled)}</p><p>Google account: {l.google_email||'Not connected'}</p><p>Service access: {l.licensed?'Allowed':'Blocked / not assigned'}</p><p>Last import: {date(l.synced_at)}</p><p>Next import: {date(l.maintenance_due_at)}</p><p>Imported: {l.imported} / {l.review_total??'unknown'}</p></div>

 <div><h4 className="font-semibold">AI replies</h4><p>Draft worker: {l.draftEligibility}</p><p>Publishing: {l.publishEligibility}</p><p>Drafts: {on(l.ai_consent)} · Autopilot: {on(l.auto_enabled)}</p><p>4 stars: {on(l.auto_four)} · 5 stars: {on(l.auto_five)}</p><p>1–3-star drafts: {on(l.draft_low_stars)}</p><p>Delay: {count(l.reply_delay_minutes)} minutes</p><p>Last check: {date(l.draft_checked_at)}</p><p>AI requests this hour: {l.ai_hour_used} / 20</p><p>Monthly AI: {l.monthly_ai_used} / {count(account.ai_monthly_limit)}</p></div>

 <div><h4 className="font-semibold">Reply queue</h4><p>Answered: {l.answered} ({l.positive_answered} positive)</p><p>Older auto-published: {l.old_auto_answered}</p><p>Queued: {l.queued} · Waiting for draft: {l.waiting}</p><p>Manual drafts: {l.manual_drafts} · Uncertain: {l.uncertain}</p><p>Next reply: {date(l.next_reply)}</p></div>

 <div><h4 className="font-semibold">Google profile AI</h4><p>Agent: {on(l.profile_ai_enabled)}</p><p>Last findings update: {date(l.profile_checked)}</p><p>Draft records: {l.profile_drafts} · Failed: {l.profile_errors}</p></div>

 <div><h4 className="font-semibold">Heat map</h4><p>Schedule: {on(l.heatmap_enabled)} · {l.cadence||'Not configured'}</p><p>Latest scan in 30 days: {date(l.scan_at)}</p><p>Pending points: {l.scan_pending} · Failed / uncertain: {l.scan_errors}</p></div>

 <div><h4 className="font-semibold">Alerts</h4><p>Active: {l.alerts}</p>{l.alert_stages&&<p>{l.alert_stages}</p>}<p>Last failure: {date(l.last_failure)}</p><p>Last admin email: {date(l.email_sent)}</p></div></div></article>)}

 </section></ModalDialog>}

 </section>;

}

