"use client";
import {useReviewEndpoint} from './review-endpoint';
import { importReviewPages } from '@/lib/google-business/import-pages';
import { useCallback,useEffect,useMemo,useRef,useState } from 'react';
import {usePathname,useRouter,useSearchParams} from 'next/navigation';
import { Discovery } from './google-live-review-discovery';
import {GoogleLiveReviewWorkspace} from './google-live-review-workspace';
import { appendUnseenReviews,countReviewFilters,mergeReviewSnapshot,reviewFilters,scopeReviewWorkspaces } from './google-live-review-model';
import type { Post,Row,Snapshot,Workspace } from './google-live-review-types';
export function GoogleLiveReviews({admin=false,businessId,businessIds,draftOnly=false,managed=false,promoteActions=false}:{managed?:boolean;admin?:boolean;businessId?:string;businessIds?:string[];draftOnly?:boolean;promoteActions?:boolean}){
 const params=useSearchParams();
 const pathname=usePathname(),router=useRouter();
 const [importStatus,setImportStatus]=useState<{id:string;name:string;done:boolean}|null>(null);
 const [reviewFilter,setReviewFilter]=useState('all');
 const [ratingFilter,setRatingFilter]=useState('all');
 useEffect(()=>{const requested=params.get('view');setReviewFilter(reviewFilters.find(([key])=>key===requested)?.[0]||'all');},[params]);
 const inScope=(id:string)=>(!businessId||id===businessId)&&(!businessIds||businessIds.includes(id));
 const reviewEndpoint=useReviewEndpoint();
 const endpoint=admin?'/api/admin/google-business/reviews':reviewEndpoint;
 const selectedIds=businessId?(businessIds&&!businessIds.includes(businessId)?[]:[businessId]):businessIds;
 const baseReadEndpoint=selectedIds?endpoint+'?locations='+encodeURIComponent([...selectedIds].sort().join(',')):endpoint;
 const requestedView=params.get('view');
 const readEndpoint=requestedView&&reviewFilters.some(([key])=>key===requestedView)?baseReadEndpoint+(baseReadEndpoint.includes('?')?'&':'?')+'view='+encodeURIComponent(requestedView):baseReadEndpoint;
 const mounted=useRef(true),importing=useRef(false),refreshVersion=useRef(0);
 const [snapshot,setSnapshot]=useState<Snapshot|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const scopedWorkspaces=useMemo(()=>scopeReviewWorkspaces(snapshot?.workspaces||[],businessId,businessIds),[snapshot,businessId,businessIds]);
 const filterCounts=useMemo(()=>countReviewFilters(scopedWorkspaces),[scopedWorkspaces]);
 const refresh=useCallback(async(preserveLoaded=false)=>{const version=++refreshVersion.current;const r=await fetch(readEndpoint,{cache:'no-store'});const data=await r.json();if(!r.ok)throw new Error(data.error || 'Could not load Google reviews.');if(!mounted.current||version!==refreshVersion.current)return;
  setSnapshot(old=>mergeReviewSnapshot(data,old,preserveLoaded));
 },[readEndpoint]);
 useEffect(()=>{let active=true;mounted.current=true;setError('');refresh(true).catch(e=>{if(active)setError(e.message);});return()=>{active=false;mounted.current=false;refreshVersion.current++;};},[readEndpoint]);
 useEffect(()=>{if(!admin&&!managed&&!busy&&!error&&!importing.current){const pending=snapshot?.workspaces.find(w=>inScope(w.business_id)&&w.enabled&&w.connected&&!w.initial_import_completed&&(!w.synced_at||w.next_page)&&!w.last_error);if(pending)void businessAction('sync',pending.business_id);}},[snapshot,busy,error,admin,managed]); // Authenticated server routes enforce ownership on every action.
 // After initial import the page only observes status; the scheduled worker owns refreshes.
 useEffect(()=>{if(admin)return;let polling=false;const timer=setInterval(async()=>{if(polling||importing.current||document.hidden)return;polling=true;try{await refresh(true);}catch{/* Keep saved reviews visible when a status poll fails. */}finally{polling=false;}},15000);return()=>clearInterval(timer);},[readEndpoint,admin]);
 const post:Post=useCallback(async body=>{const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw Object.assign(new Error(data.error || 'Request failed.'),{status:r.status});return data;},[endpoint]);
 async function moreReviews(w:Workspace){
  setBusy(true);setError('');try{const view=params.get('view');const filtered=view&&reviewFilters.some(([key])=>key===view)?'&view='+encodeURIComponent(view):'';const response=await fetch(endpoint+'?businessId='+encodeURIComponent(w.business_id)+'&offset='+w.reviews.length+filtered,{cache:'no-store'});const page=await response.json();if(!response.ok)throw new Error(page.error);setSnapshot(old=>old?{...old,workspaces:old.workspaces.map(item=>item.business_id===w.business_id?{...item,reviews:appendUnseenReviews(item.reviews,page.reviews as Row[]),moreReviews:page.moreReviews}:item)}:old);}catch(e){setError(e instanceof Error?e.message:'Could not load more reviews.');}finally{setBusy(false);}
 }
 function selectReviewFilter(key:string){setReviewFilter(key);const next=new URLSearchParams(params.toString());if(key==='all')next.delete('view');else next.set('view',key);router.replace(pathname+(next.size?'?'+next.toString():''),{scroll:false});}
 async function businessAction(action:'sync'|'stop'|'remove',businessId:string){
  if(action==='stop'&&!window.confirm('Stop Google syncing, AI, and automatic replies for this business? An already-sent reply may still finish. Contact support to also remove Tap Rater’s manager access on Google.'))return;
  if(action==='remove'&&!window.confirm('Remove this stopped assignment and its cached reviews and drafts?'))return;
  setBusy(true);setError('');try{if(action==='sync'){if(importing.current)return;importing.current=true;const workspace=snapshot?.workspaces.find(w=>w.business_id===businessId);setImportStatus({id:businessId,name:workspace?.title||workspace?.business_name||'your business',done:false});await importReviewPages(async()=>{const result=await post({action,businessId}) as {imported:number;more:boolean};if(mounted.current)await refresh();return result;},()=>{},undefined,()=>!mounted.current);if(mounted.current)setImportStatus(current=>current?.id===businessId?{...current,done:true}:current);}else await post({action,businessId});if(mounted.current)await refresh();}catch(e){if(mounted.current)setError(e instanceof Error?e.message:'Request failed.');}finally{importing.current=false;if(mounted.current)setBusy(false);}
 }
 const importWorkspace=snapshot?.workspaces.find(w=>inScope(w.business_id)&&(importStatus?w.business_id===importStatus.id:true));
 const imported=Number(importWorkspace?.imported_count||0),total=importWorkspace?.review_total;
 const initialComplete=Boolean(importWorkspace?.initial_import_completed||importStatus?.done);
 const importError=error||importWorkspace?.last_error;
 const checking=Boolean(importWorkspace?.sync_in_progress||(importStatus&&!importStatus.done&&busy));
 const percent=typeof total==='number'&&total>0?Math.min(99,Math.floor(imported/total*100)):null;
 return <section aria-label="Live Google reviews" className="tr-review-list"><h2 className="sr-only">Google reviews</h2>
 {importWorkspace&&(!initialComplete||checking||importError)&&<div role="status" aria-live="polite" className="mb-2 flex items-center gap-2 text-xs text-muted" title={importWorkspace.business_name}>
 {checking&&!importError&&<span aria-hidden="true" className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-teal-600/25 border-t-teal-600 motion-reduce:animate-none"/>}
 <span>{initialComplete?(importError?'Update check paused':'Checking for updates…'):`${importError?'Import paused':'Importing'} · ${imported}${typeof total==='number'?` / ${total}`:''} reviews${!importError&&percent!==null?` · ${percent}%`:''}`}</span>
 </div>}

 <p className="sr-only">{draftOnly?'Draft-only workspace. Approve saved drafts for review; nothing is published.':snapshot?.publishingEnabled?'Live publishing activated. Publishing a saved reply requires your confirmation.':'Live publishing disabled. Saved and approved replies remain drafts.'}</p>
 {error&&<p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}{!snapshot&&!error&&<p className="mt-3">Loading Google connection status…</p>}

 {admin&&!draftOnly&&snapshot&&<Discovery post={post} refresh={refresh} businesses={snapshot.businesses || []}/>}
 {snapshot?.workspaces.length===0&&<p className="mt-4 text-sm">No live Google business assigned yet. {admin?'After approval, load the managing account’s locations and assign the correct customer.':managed?'The client can connect this location in their account.':'Connect your Google business below to import reviews.'}</p>}
 {scopedWorkspaces.map((w,index)=><GoogleLiveReviewWorkspace key={w.business_id} w={w} businessId={businessId} admin={admin} allowGoogleConnection={!admin&&!managed} promoteActions={promoteActions&&index===0} busy={busy} draftOnly={draftOnly} publishingEnabled={Boolean(snapshot?.publishingEnabled)} reviewFilter={reviewFilter} ratingFilter={ratingFilter} filterCounts={filterCounts} showFilters={index===0} onFilter={selectReviewFilter} onRatingFilter={setRatingFilter} post={post} refresh={refresh} businessAction={businessAction} moreReviews={moreReviews}/>)}

 </section>;
}
