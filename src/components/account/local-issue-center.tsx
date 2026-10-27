'use client';
import {heatmapFeatureEnabled} from '@/lib/heatmap-feature';
import {useEffect,useMemo,useState} from 'react';
import {filterLocalIssues,countUnreadIssues,type Draft,type Issue,type Snapshot} from './local-issue-model';
import {LocalIssueSummary} from './local-issue-summary';
import {LocalIssueGrid} from './local-issue-grid';
import {LocalIssueDialog} from './local-issue-dialog';
export function LocalIssueCenter({businessId,admin=false,compact=false,profileOnly=false,onUseDescription}:{businessId?:string;admin?:boolean;compact?:boolean;profileOnly?:boolean;onUseDescription?:(text:string)=>void}){
 const [data,setData]=useState<Snapshot|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(''),[confirm,setConfirm]=useState(''),[notice,setNotice]=useState(''),[location,setLocation]=useState('');
 const [opened,setOpened]=useState('');
 const endpoint=admin?'/api/admin/local/issues':'/api/account/local/issues';
 async function refresh(){const r=await fetch(endpoint+(businessId?`?businessId=${businessId}`:''),{cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d.error||'Unable to load notifications.');setData(d);}
 useEffect(()=>{let active=true;const load=async()=>{try{const r=await fetch(endpoint+(businessId?`?businessId=${businessId}`:''),{cache:'no-store'}),d=await r.json();if(!r.ok)throw new Error(d.error);if(active){setData(d);setError('');}}catch(e){if(active)setError(e instanceof Error?e.message:'Unable to load notifications.');}};setData(null);setConfirm('');setOpened('');load();const timer=setInterval(load,60000);return()=>{active=false;clearInterval(timer);};},[endpoint,businessId]);
 async function act(issue:Issue,action:string,edits?:{draft:Draft;expectedDraft:Draft}){setBusy(issue.id);setError('');setNotice('');try{const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,businessId:issue.business_id,id:issue.id,fingerprint:issue.fingerprint,...edits})});const d=await r.json();if(!r.ok)throw new Error(d.error);setConfirm('');await refresh();setNotice(action==='editDraft'?'Draft edits saved. Nothing published.':action==='preview'?'AI draft prepared. No charge and nothing published.':action==='approveDraft'?'Draft approved for later use. Nothing was applied or published.':action==='request'?'Request saved. You have not been charged.':'Notification marked reviewed.');return true;}catch(e){setError(e instanceof Error?e.message:'Unable to save.');return false;}finally{setBusy('');}}
 const issues=useMemo(()=>filterLocalIssues(data?.issues||[],location,profileOnly,heatmapFeatureEnabled),[data,location,profileOnly]);
 const unread=useMemo(()=>countUnreadIssues(issues),[issues]);
 if(compact)return <LocalIssueSummary issues={issues} unread={unread} error={error} data={data} businessId={businessId}/>;
 return <section className="tr-client-issues space-y-3"><div><p className="tr-eyebrow">Your local presence</p><h2 className="mt-2 text-xl font-bold">{profileOnly?'Profile improvements & AI fixes':'Notifications & AI drafts'}</h2><p className="mt-2 text-sm text-muted">See what needs attention at each location. Suggestions never change Google, your website, or your replies automatically.</p></div>

  <div className="flex flex-wrap items-center gap-3">{!businessId&&<label className="text-sm">Location<select className="ml-2 rounded-lg border border-line p-2" value={location} onChange={e=>{setLocation(e.target.value);setConfirm('');setOpened('');}}><option value="">All locations</option>{data?.locations.map(l=><option key={l.id} value={l.id}>{l.business_name}</option>)}</select></label>}<span className="text-sm">{unread} unread · {issues.length} active</span><button className="tr-button-ghost" disabled={!!busy} onClick={()=>refresh().catch(e=>setError(e.message))}>Refresh notifications</button></div>
  {error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}{notice&&<p role="status" className="rounded-lg bg-emerald-50 p-3 text-emerald-900">{notice}</p>}
  {!!data?.errors.length&&<p role="alert">Some checks could not refresh: {data.errors.join(', ')}. Existing findings may be out of date.</p>}
  {!data&&!error&&<p>Checking saved profile data…</p>}{data&&!issues.length&&<p>No issues detected in the available data. This is not a complete audit of Google or your website.</p>}
  <LocalIssueGrid issues={issues} setOpened={setOpened} setConfirm={setConfirm}/>
  {issues.filter(i=>i.id===opened).map(i=><LocalIssueDialog key={i.id} i={i} busy={busy} error={error} notice={notice} confirm={confirm} setOpened={setOpened} setConfirm={setConfirm} act={act} onUseDescription={onUseDescription}/>)}
 </section>;
}
