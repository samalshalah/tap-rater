"use client";
import { importReviewPages } from '@/lib/google-business/import-pages';
import { RefreshCw } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useEffect,useRef,useState } from 'react';
import { Discovery,LiveSettings,ReviewListRow,matchesReview } from './google-live-review-components';
import type { Post,Row,Snapshot,Workspace } from './google-live-review-types';
import { ReviewAutomationControls } from './review-automation-controls';
const GoogleConnectionWizard=dynamic(()=>import('./google-connection-wizard').then(module=>module.GoogleConnectionWizard),{loading:()=> <p role="status">Loading Google connection...</p>});
export function GoogleLiveReviews({admin=false,businessId,businessIds,draftOnly=false}:{admin?:boolean;businessId?:string;businessIds?:string[];draftOnly?:boolean}){
 const [manageConnectionOpen,setManageConnectionOpen]=useState(()=>typeof window!=='undefined'&&new URLSearchParams(window.location.search).has('connection')&&new URLSearchParams(window.location.search).get('location')===businessId);
 const [importStatus,setImportStatus]=useState<{id:string;name:string;done:boolean}|null>(null);
 const [reviewFilter,setReviewFilter]=useState('all');
 const inScope=(id:string)=>(!businessId||id===businessId)&&(!businessIds||businessIds.includes(id));
 const endpoint=admin?'/api/admin/google-business/reviews':'/api/account/reviews/live';
 const selectedIds=businessId?(businessIds&&!businessIds.includes(businessId)?[]:[businessId]):businessIds;
 const readEndpoint=selectedIds?endpoint+'?locations='+encodeURIComponent([...selectedIds].sort().join(',')):endpoint;
 const mounted=useRef(true),importing=useRef(false),refreshVersion=useRef(0);
 const [snapshot,setSnapshot]=useState<Snapshot|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function refresh(preserveLoaded=false){const version=++refreshVersion.current;const r=await fetch(readEndpoint,{cache:'no-store'});const data=await r.json();if(!r.ok)throw new Error(data.error || 'Could not load Google reviews.');if(!mounted.current||version!==refreshVersion.current)return;
  setSnapshot((old:Snapshot|null)=>!preserveLoaded||!old?data:{...data,workspaces:(data.workspaces as Workspace[]).map(w=>{const previous=old.workspaces.find(item=>item.business_id===w.business_id);return previous&&previous.reviews.length>100?{...w,reviews:[...w.reviews,...previous.reviews.filter(r=>!w.reviews.some(fresh=>fresh.id===r.id))],moreReviews:previous.moreReviews}:w;})});
 }
 useEffect(()=>{let active=true;mounted.current=true;setSnapshot(null);setError('');refresh().catch(e=>{if(active)setError(e.message);});return()=>{active=false;mounted.current=false;refreshVersion.current++;};},[readEndpoint]);
 useEffect(()=>{if(!admin&&!busy&&!error&&!importing.current){const pending=snapshot?.workspaces.find(w=>inScope(w.business_id)&&w.enabled&&w.connected&&!w.initial_import_completed&&(!w.synced_at||w.next_page)&&!w.last_error);if(pending)void businessAction('sync',pending.business_id);}},[snapshot,busy,error,admin]); // Authenticated server routes enforce ownership on every action.
 // After initial import the page only observes status; the scheduled worker owns refreshes.
 useEffect(()=>{if(admin)return;let polling=false;const timer=setInterval(async()=>{if(polling||importing.current||document.hidden)return;polling=true;try{await refresh(true);}catch{/* Keep saved reviews visible when a status poll fails. */}finally{polling=false;}},15000);return()=>clearInterval(timer);},[readEndpoint,admin]);
 const post:Post=async body=>{const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw Object.assign(new Error(data.error || 'Request failed.'),{status:r.status});return data;};
 async function moreReviews(w:Workspace){
  setBusy(true);setError('');try{const response=await fetch(endpoint+'?businessId='+encodeURIComponent(w.business_id)+'&offset='+w.reviews.length,{cache:'no-store'});const page=await response.json();if(!response.ok)throw new Error(page.error);setSnapshot(old=>old?{...old,workspaces:old.workspaces.map(item=>item.business_id===w.business_id?{...item,reviews:[...item.reviews,...(page.reviews as Row[]).filter(r=>!item.reviews.some(existing=>existing.id===r.id))],moreReviews:page.moreReviews}:item)}:old);}catch(e){setError(e instanceof Error?e.message:'Could not load more reviews.');}finally{setBusy(false);}
 }
 async function businessAction(action:'sync'|'stop'|'remove',businessId:string){
  if(action==='stop'&&!window.confirm('Stop Google syncing, AI, and automatic replies for this business? An already-sent reply may still finish. Contact support to also remove Tap Rater’s manager access on Google.'))return;
  if(action==='remove'&&!window.confirm('Remove this stopped assignment and its cached reviews and drafts?'))return;
  setBusy(true);setError('');try{if(action==='sync'){if(importing.current)return;importing.current=true;const workspace=snapshot?.workspaces.find(w=>w.business_id===businessId);setImportStatus({id:businessId,name:workspace?.title||workspace?.business_name||'your business',done:false});setManageConnectionOpen(false);await importReviewPages(async()=>{const result=await post({action,businessId}) as {imported:number;more:boolean};if(mounted.current)await refresh();return result;},()=>{},undefined,()=>!mounted.current);if(mounted.current)setImportStatus(current=>current?.id===businessId?{...current,done:true}:current);}else await post({action,businessId});if(mounted.current)await refresh();}catch(e){if(mounted.current)setError(e instanceof Error?e.message:'Request failed.');}finally{importing.current=false;if(mounted.current)setBusy(false);}
 }
 const importWorkspace=snapshot?.workspaces.find(w=>inScope(w.business_id)&&(importStatus?w.business_id===importStatus.id:true));
 const imported=Number(importWorkspace?.imported_count||0),total=importWorkspace?.review_total;
 const saved=Number(importWorkspace?.saved_count??imported);
 const initialComplete=Boolean(importWorkspace?.initial_import_completed||importStatus?.done);
 const importError=error||importWorkspace?.last_error;
 const checking=Boolean(importWorkspace?.sync_in_progress||(importStatus&&!importStatus.done&&busy));
 const percent=typeof total==='number'&&total>0?Math.min(99,Math.floor(imported/total*100)):null;
 return <section aria-label="Live Google reviews" className="tr-review-list"><h2 className="sr-only">Google reviews</h2>
 {importWorkspace&&<div role="status" aria-live="polite" className="mb-2 flex items-center gap-2 text-xs text-muted" title={importWorkspace.business_name}>
 {checking&&!importError&&<span aria-hidden="true" className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-teal-600/25 border-t-teal-600 motion-reduce:animate-none"/>}
 <span>{initialComplete?`${saved} reviews saved${importError?' · Update check paused':checking?' · Checking for updates':''}`:`${importError?'Import paused':'Importing'} · ${imported}${typeof total==='number'?` / ${total}`:''} reviews${!importError&&percent!==null?` · ${percent}%`:''}`}</span>
 </div>}

 <p className="sr-only">{draftOnly?'Draft-only workspace. Approve saved drafts for review; nothing is published.':snapshot?.publishingEnabled?'Live publishing activated. Publishing a saved reply requires your confirmation.':'Live publishing disabled. Saved and approved replies remain drafts.'}</p>
 {error&&<p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}{!snapshot&&!error&&<p className="mt-3">Loading Google connection status…</p>}

 <nav className="tr-review-filters" aria-label="Review filters" title="Counts reflect loaded reviews. Load more below to include older reviews.">{[['all','All reviews'],['unanswered','Awaiting reply'],['drafts','Drafts'],['approved','Approved'],['replied','Replied'],['spam','Suspected spam']].map(([key,label])=><button key={key} aria-pressed={reviewFilter===key} onClick={()=>setReviewFilter(key)}>{label} ({snapshot?snapshot.workspaces.filter(w=>inScope(w.business_id)).flatMap(w=>w.reviews).filter(r=>matchesReview(r,key)).length:'…'})</button>)}</nav>
 {admin&&!draftOnly&&snapshot&&<Discovery post={post} refresh={refresh} businesses={snapshot.businesses || []}/>}
 {snapshot?.workspaces.length===0&&<p className="mt-4 text-sm">No live Google business assigned yet. {admin?'After approval, load the managing account’s locations and assign the correct customer.':'Connect your Google business below to import reviews.'}</p>}
 {snapshot?.workspaces.filter(w=>inScope(w.business_id)).map(w=><section key={w.business_id} className="tr-review-workspace"><div className="tr-review-workspace-meta">{!businessId&&<h3>{w.business_name}</h3>}<span>{!w.enabled?'Stopped':!w.connected?'Google reconnection required':''}</span></div>{w.last_error&&<p className="mt-2 text-sm text-red-700">{w.last_error}</p>}

 <div className="my-3 rounded-lg border border-line bg-white p-4"><ReviewAutomationControls key={w.business_id+':'+w.settings_version} location={{...w,id:w.business_id,connected:w.connected&&w.enabled}} onSaved={refresh}/></div><div className="my-3 flex flex-wrap items-center justify-between gap-2"><span className="text-xs text-muted">{w.enabled&&w.connected?'Automatic imports on':'Imports paused'}{w.synced_at?' · Updated '+new Date(w.synced_at).toLocaleString():''}</span><div className="flex gap-2"><button className="tr-button-ghost" disabled={busy||!w.enabled||!w.connected} onClick={()=>businessAction('sync',w.business_id)}><RefreshCw size={14}/>{busy?(w.initial_import_completed?'Checking…':'Importing…'):w.initial_import_completed?'Check for updates':w.next_page?'Continue import':'Sync reviews'}</button><LiveSettings key={w.business_id+':'+w.settings_version} workspace={w} post={post} refresh={refresh} publishing={false}><button className="tr-button-ghost" disabled={busy||!w.enabled} onClick={()=>businessAction('stop',w.business_id)}>Disconnect review imports</button>{admin&&!w.enabled&&<button className="tr-button-ghost" disabled={busy} onClick={()=>businessAction('remove',w.business_id)}>Remove stopped assignment</button>}</LiveSettings></div></div>
 <div className="tr-review-table-wrap"><table className="tr-review-table"><caption className="sr-only">Google reviews and reply drafts. Open a review to read or edit its draft.</caption><thead><tr><th>Reviewer</th><th>Rating</th><th>Review (excerpt)</th><th>Reply status</th><th>Date</th><th>Open</th></tr></thead><tbody>{w.reviews.filter(r=>matchesReview(r,reviewFilter)).map(r=><ReviewListRow key={r.id} review={r} post={post} refresh={refresh} aiAllowed={w.ai_consent} active={w.enabled&&w.connected} canPublish={!draftOnly&&snapshot.publishingEnabled}/>)}</tbody></table>{w.reviews.length>0&&!w.reviews.some(r=>matchesReview(r,reviewFilter))&&<p className="p-4 text-sm">No reviews match this filter.</p>}</div>

 {w.moreReviews&&<button className="tr-button-ghost mt-4" disabled={busy} onClick={()=>moreReviews(w)}>Load more Google reviews</button>}{!w.reviews.length&&<p className="mt-4 text-sm">No reviews imported yet. Sync reviews to get started.</p>}
 </section>)} {!admin&&snapshot&&<details className="tr-review-settings" open={manageConnectionOpen} onToggle={e=>setManageConnectionOpen(e.currentTarget.open)}><summary>Manage Google connection</summary>{manageConnectionOpen&&<GoogleConnectionWizard key={businessId||'all'} onLinked={async()=>{setManageConnectionOpen(false);const url=new URL(window.location.href);url.searchParams.delete('connection');url.searchParams.delete('step');url.searchParams.delete('reason');window.history.replaceState(null,'',url);await refresh();}} businessId={businessId}/>}</details>}

 </section>;
}
