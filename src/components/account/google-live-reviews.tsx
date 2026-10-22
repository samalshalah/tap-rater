"use client";
import {useEffect,useState,useRef} from 'react';
import {GoogleConnectionWizard} from './google-connection-wizard';
import {importReviewPages} from '@/lib/google-business/import-pages';
import {replyStyles,type ReplyStyle,type ReplySuggestions} from '@/lib/review-ai-options';
import type {GoogleReview} from '@/lib/google-business/client';
type Row={id:string;data:GoogleReview;draft:string;version:number;approved_version?:number|null;publish_state:string};
type Workspace={owner:string;business_id:string;business_name:string;title:string;enabled:boolean;connected:boolean;synced_at:string|null;next_page:string|null;last_error:string|null;ai_consent:boolean;auto_enabled:boolean;auto_four:boolean;auto_five:boolean;auto_style:ReplyStyle;settings_version:number;draft_error?:string|null;draft_checked_at?:string|null;moreReviews:boolean;reviews:Row[]};
type Snapshot={workspaces:Workspace[];publishingEnabled:boolean;businesses?:{id:string;business_name:string;email:string}[]};
type Post=(body:unknown)=>Promise<Record<string,unknown>>;
const ratings:Record<string,number>={ONE:1,TWO:2,THREE:3,FOUR:4,FIVE:5};
function LiveCard({review,post,refresh,canPublish,aiAllowed,active}:{review:Row;post:Post;refresh:()=>Promise<void>;canPublish:boolean;aiAllowed:boolean;active:boolean}){
 const [draft,setDraft]=useState(review.draft),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[suggestions,setSuggestions]=useState<ReplySuggestions|null>(null),[preview,setPreview]=useState(false);
 const dirty=draft.trim()!==review.draft,unresolved=['publishing','uncertain'].includes(review.publish_state);
 async function action(kind:'save'|'suggest'|'publish'|'reconcile'|'approve'){
  if(kind==='publish'&&!window.confirm('Publish this exact saved reply publicly on Google? It will replace the current business reply if one exists.'))return;
  setBusy(true);setMessage('');
  try{
   const result=await post({action:kind,id:review.id,...(kind==='save'?{draft,version:review.version}:kind==='publish'?{version:review.version,confirmPublicReply:true}:kind==='approve'?{version:review.version}:{})});
   if(kind==='suggest')setSuggestions(result.suggestions as ReplySuggestions);
   else{await refresh();setMessage(kind==='reconcile'?(result.published?'Google confirms this reply is published.':result.resolved?'Result refreshed. Review the current Google reply before deciding whether to publish again.':'The result is still uncertain. Wait five minutes before checking again.'):'Saved successfully.');}
  }catch(e){setMessage(e instanceof Error?e.message:'Request failed.');if(kind==='publish')await refresh();}finally{setBusy(false);}
 }
 return <article className="tr-card p-5"><div className="flex justify-between gap-3"><h4 className="font-semibold">{review.data.reviewer?.isAnonymous?'Anonymous':review.data.reviewer?.displayName || 'Google reviewer'}</h4><span className="text-sm">{review.approved_version===review.version?'Approved draft':review.draft?'Draft saved':review.publish_state}</span></div>
  <p className="mt-2 text-sm">Google review · {ratings[review.data.starRating] || 'Unspecified'}/5</p><p className="mt-3 whitespace-pre-wrap">{review.data.comment || 'Rating only; no written review.'}</p>
  {review.data.reviewReply?.comment&&<div className="mt-4 rounded-lg bg-soft p-3 text-sm"><strong>Current reply on Google</strong><p className="mt-2 whitespace-pre-wrap">{review.data.reviewReply.comment}</p></div>}
  <button className="tr-button-ghost mt-4" disabled={busy||!aiAllowed||!active||unresolved} onClick={()=>action('suggest')}>Suggest four replies with AI</button>
  {!aiAllowed&&<p className="mt-2 text-xs">Allow AI in this business’s settings to generate suggestions.</p>}
  {suggestions&&<div className="mt-3 grid gap-3 sm:grid-cols-2">{Object.entries(replyStyles).map(([key,label])=><div className="rounded-lg border border-line p-3" key={key}><strong>{label}</strong><p className="my-2 text-sm">{suggestions[key as ReplyStyle]}</p><button className="text-sm underline" disabled={busy||unresolved} onClick={()=>{if(!draft.trim()||window.confirm('Replace the unsaved reply text with this suggestion?'))setDraft(suggestions[key as ReplyStyle]);}}>Use {label}</button></div>)}</div>}
  <label className="mt-4 block text-sm font-semibold" htmlFor={'live-'+review.id}>Reply draft</label><textarea id={'live-'+review.id} className="mt-2 min-h-32 w-full rounded-lg border border-line p-3" maxLength={4000} value={draft} disabled={busy||unresolved||!active} onChange={e=>setDraft(e.target.value)}/>
  <div className="mt-3 flex flex-wrap gap-2"><button className="tr-button-ghost" disabled={busy||unresolved||!active} onClick={()=>action('save')}>Save draft</button><button className="tr-button-ghost" disabled={!draft.trim()} onClick={()=>setPreview(!preview)}>Preview reply</button><button className="tr-button-ghost" disabled={busy||dirty||!draft.trim()||unresolved||!active||review.approved_version===review.version} onClick={()=>action('approve')}>Approve draft</button><button className="tr-button-primary" disabled={busy||dirty||!draft.trim()||unresolved||!canPublish||!active||review.publish_state==='published'} onClick={()=>action('publish')}>Publish to Google</button>{unresolved&&<button className="tr-button-ghost" disabled={busy||!active} onClick={()=>action('reconcile')}>Check publish result</button>}</div>
  <p className="mt-2 text-sm">Approval saves your decision. It does not publish a reply.</p>{dirty&&<p className="mt-2 text-sm">Save your changes before approval.</p>}{preview&&<div className="mt-4 rounded-lg bg-soft p-4"><strong>Reply preview</strong><p className="mt-2 whitespace-pre-wrap">{draft}</p></div>}<p role="status" className="mt-3 text-sm">{message}</p>
 </article>;
}
function LiveSettings({workspace:w,post,refresh}:{workspace:Workspace;post:Post;refresh:()=>Promise<void>;publishing:boolean}){
 const [ai,setAi]=useState(w.ai_consent),[style,setStyle]=useState(w.auto_style),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function save(){
  setBusy(true);setMessage('');try{await post({action:'settings',settings:{businessId:w.business_id,aiConsent:ai,autoEnabled:false,four:false,five:false,style,version:w.settings_version,confirmAutomaticPosting:false}});await refresh();setMessage('Draft settings saved. Nothing will be published.');}catch(e){setMessage(e instanceof Error?e.message:'Settings could not be saved.');}finally{setBusy(false);}
 }
 return <section className="my-5 rounded-xl border border-line p-4"><h4 className="font-semibold">Automatic imports and reply drafts</h4>
 <p className="mt-2 text-sm">Connected locations are checked in the background every 15 minutes. Large imports and busy queues continue in subsequent runs, even when you close this page.</p>
 <fieldset disabled={busy||!w.enabled||!w.connected} className="mt-3 space-y-3">
 <label className="flex gap-2 text-sm"><input type="checkbox" checked={ai} onChange={e=>setAi(e.target.checked)}/>Allow Cloudflare AI to process review text and ratings and automatically prepare reply drafts for this location.</label>
 <label>Reply style <select className="rounded border p-2" value={style} onChange={e=>setStyle(e.target.value as ReplyStyle)}>{Object.entries(replyStyles).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
 <p className="text-xs text-muted">All star ratings are included. Existing replies and saved drafts are preserved. Up to 20 AI generations per location per day, shared with manual suggestions; remaining reviews stay queued. Review and approve each draft. Approval never publishes.</p>
 <button className="tr-button-ghost" onClick={save}>Save Google review settings</button></fieldset>
 {w.draft_error&&<p role="status" className="mt-3 text-sm text-amber-800">{w.draft_error}</p>}
 <p role="status" className="mt-2 text-sm">{message}</p></section>;
}

function Discovery({post,refresh,businesses}:{post:Post;refresh:()=>Promise<void>;businesses:NonNullable<Snapshot['businesses']>}){
 const [accounts,setAccounts]=useState<{name:string;accountName?:string;type?:string}[]>([]),[locations,setLocations]=useState<{name:string;title?:string}[]>([]),[account,setAccount]=useState(''),[location,setLocation]=useState(''),[business,setBusiness]=useState(''),[parent,setParent]=useState(''),[nextAccounts,setNextAccounts]=useState(''),[nextLocations,setNextLocations]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function run(kind:'accounts'|'locations'|'bind',more=false,group=''){
  if(kind==='bind'&&!window.confirm('Assign this Google location to the selected customer? Verify that the customer owns this business and has authorized Tap Rater to manage its reviews.'))return;
  setBusy(true);setMessage('');try{
   const data=await post(kind==='accounts'?{action:kind,...(group||parent?{parent:group||parent}:{}),...(more?{pageToken:nextAccounts}:{})}:kind==='locations'?{action:kind,account,...(more?{pageToken:nextLocations}:{})}:{action:kind,businessId:business,account,location,confirmAssignment:true});
   if(kind==='accounts'){setAccounts(old=>[...(more?old:[]),...(data.accounts as typeof accounts)]);setNextAccounts(String(data.nextPageToken || ''));if(group)setParent(group);}
   if(kind==='locations'){setLocations(old=>[...(more?old:[]),...(data.locations as typeof locations)]);setNextLocations(String(data.nextPageToken || ''));}
   if(kind==='bind'){await refresh();setMessage('Location assigned. Open its workspace and sync reviews.');}
  }catch(e){setMessage(e instanceof Error?e.message:'Google access unavailable.');}finally{setBusy(false);}
 }
 return <section className="my-5 rounded-xl border border-line p-5"><h3 className="font-semibold">Assign a managed Google business</h3><p className="mt-2 text-sm">Use the existing managing account. Successful location and review reads are required before assignment. Customers do not need their own Cloud project.</p><fieldset disabled={busy} className="mt-4 space-y-3">
 <button className="tr-button-ghost" onClick={()=>run('accounts')}>Check Google access / load accounts</button>{parent&&<p className="text-sm">Browsing organization {parent}. <button className="underline" onClick={()=>{setParent('');setAccounts([]);setAccount('');setLocations([]);}}>Back to root accounts</button></p>}
 {accounts.length>0&&<><label className="block">Google account <select className="ml-2 rounded border p-2" value={account} onChange={e=>{setAccount(e.target.value);setLocations([]);setLocation('');setNextLocations('');}}><option value="">Choose account</option>{accounts.map(a=><option key={a.name} value={a.name}>{a.accountName || a.name} ({a.type})</option>)}</select></label><button className="tr-button-ghost" disabled={!account} onClick={()=>run('accounts',false,account)}>Browse child accounts</button><button className="tr-button-ghost ml-2" disabled={!account} onClick={()=>run('locations')}>Load locations</button></>}
 {nextAccounts&&<button className="tr-button-ghost" onClick={()=>run('accounts',true)}>More accounts</button>}
 {locations.length>0&&<><label className="block">Google location <select className="ml-2 rounded border p-2" value={location} onChange={e=>setLocation(e.target.value)}><option value="">Choose location</option>{locations.map(l=><option key={l.name} value={l.name}>{l.title || l.name} · {l.name}</option>)}</select></label><label className="block">Customer business <select className="ml-2 rounded border p-2" value={business} onChange={e=>setBusiness(e.target.value)}><option value="">Choose customer business</option>{businesses.map(b=><option key={b.id} value={b.id}>{b.business_name} · {b.email}</option>)}</select></label><button className="tr-button-primary" disabled={!location||!business} onClick={()=>run('bind')}>Verify and assign location</button></>}
 {nextLocations&&<button className="tr-button-ghost" onClick={()=>run('locations',true)}>More locations</button>}</fieldset><p role="status" className="mt-3 text-sm">{message}</p></section>;
}
export function GoogleLiveReviews({admin=false,businessId,businessIds,draftOnly=false}:{admin?:boolean;businessId?:string;businessIds?:string[];draftOnly?:boolean}){
 const [reviewFilter,setReviewFilter]=useState('all');
 const inScope=(id:string)=>(!businessId||id===businessId)&&(!businessIds||businessIds.includes(id));
 const endpoint=admin?'/api/admin/google-business/reviews':'/api/account/reviews/live';
 const mounted=useRef(true),importing=useRef(false);
 const [importProgress,setImportProgress]=useState('');
 const [snapshot,setSnapshot]=useState<Snapshot|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function refresh(){const r=await fetch(endpoint,{cache:'no-store'});const data=await r.json();if(!r.ok)throw new Error(data.error || 'Could not load Google reviews.');setSnapshot(data);}
 useEffect(()=>{mounted.current=true;refresh().catch(e=>setError(e.message));return()=>{mounted.current=false;};},[endpoint]);
 useEffect(()=>{if(!admin&&!busy&&!error&&!importing.current){const pending=snapshot?.workspaces.find(w=>inScope(w.business_id)&&w.enabled&&w.connected&&(!w.synced_at||w.next_page)&&!w.last_error);if(pending)void businessAction('sync',pending.business_id);}},[snapshot,busy,error,admin]); // Authenticated server routes enforce ownership on every action.
 const post:Post=async body=>{const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw Object.assign(new Error(data.error || 'Request failed.'),{status:r.status});return data;};
 async function moreReviews(w:Workspace){
  setBusy(true);setError('');try{const response=await fetch(endpoint+'?businessId='+encodeURIComponent(w.business_id)+'&offset='+w.reviews.length,{cache:'no-store'});const page=await response.json();if(!response.ok)throw new Error(page.error);setSnapshot(old=>old?{...old,workspaces:old.workspaces.map(item=>item.business_id===w.business_id?{...item,reviews:[...item.reviews,...(page.reviews as Row[]).filter(r=>!item.reviews.some(existing=>existing.id===r.id))],moreReviews:page.moreReviews}:item)}:old);}catch(e){setError(e instanceof Error?e.message:'Could not load more reviews.');}finally{setBusy(false);}
 }
 async function businessAction(action:'sync'|'stop'|'remove',businessId:string){
  if(action==='stop'&&!window.confirm('Stop Google syncing, AI, and automatic replies for this business? An already-sent reply may still finish. Contact support to also remove Tap Rater’s manager access on Google.'))return;
  if(action==='remove'&&!window.confirm('Remove this stopped assignment and its cached reviews and drafts?'))return;
  setBusy(true);setError('');try{if(action==='sync'){if(importing.current)return;importing.current=true;setImportProgress('Importing all Google reviews…');await importReviewPages(async()=>await post({action,businessId}) as {imported:number;more:boolean},count=>{if(mounted.current)setImportProgress(`Imported ${count} reviews in this run…`);},undefined,()=>!mounted.current);if(mounted.current)setImportProgress('All review pages imported. Replies remain drafts.');}else await post({action,businessId});if(mounted.current)await refresh();}catch(e){if(mounted.current)setError(e instanceof Error?e.message:'Request failed.');}finally{importing.current=false;if(mounted.current)setBusy(false);}
 }
 return <section aria-label="Live Google reviews" className="mb-8 rounded-2xl border border-line bg-white p-5 sm:p-6"><h2 className="text-2xl font-bold">Google reviews</h2>
 <p className="mt-2 text-sm">Read real Google reviews and prepare replies for approval. Customer replies stay as drafts. </p>
 <p className="mt-3 rounded-lg bg-soft p-3 text-sm">{(!admin||draftOnly)?'Draft-only workspace. Approve saved drafts for review; nothing is published.':snapshot?.publishingEnabled?'Live publishing activated. Publishing a saved reply requires your confirmation.':'Live publishing disabled. Saved and approved replies remain drafts.'}</p>
 {error&&<p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}{!snapshot&&!error&&<p className="mt-3">Loading Google connection status…</p>}
 {!admin&&<GoogleConnectionWizard onLinked={refresh}/>}
 <label className="my-4 block text-sm">Review filter <select className="ml-2 rounded-lg border border-line p-2" value={reviewFilter} onChange={e=>setReviewFilter(e.target.value)}><option value="all">All reviews</option><option value="unanswered">Without a Google reply</option><option value="drafts">Drafts awaiting approval</option><option value="approved">Approved drafts</option></select></label><p className="text-xs text-muted">Filters apply to loaded reviews. Use Load more Google reviews to include older pages.</p>
 {importProgress&&<p role="status" className="my-3">{importProgress}</p>}
 {admin&&!draftOnly&&snapshot&&<Discovery post={post} refresh={refresh} businesses={snapshot.businesses || []}/>}
 {snapshot?.workspaces.length===0&&<p className="mt-4 text-sm">No live Google business assigned yet. {admin?'After approval, load the managing account’s locations and assign the correct customer.':'Connect your Google business above to import reviews.'}</p>}
 {snapshot?.workspaces.filter(w=>inScope(w.business_id)).map(w=><section key={w.business_id} className="mt-6 border-t border-line pt-5"><h3 className="text-xl font-semibold">{w.business_name}</h3><p className="text-sm">Google location: {w.title} · {!w.enabled?'Stopped':!w.connected?'Reconnect managing Google account':'Connected'}</p><p className="mt-2 text-xs">Last sync: {w.synced_at?new Date(w.synced_at).toLocaleString():'Not synced'}{w.next_page?' · More reviews available to sync':''}</p>{w.last_error&&<p className="mt-2 text-sm text-red-700">{w.last_error}</p>}
 <div className="mt-3 flex gap-3"><button className="tr-button-ghost" disabled={busy||!w.enabled||!w.connected} onClick={()=>businessAction('sync',w.business_id)}>{busy?'Importing…':w.next_page?'Resume importing all reviews':'Import all reviews'}</button><button className="tr-button-ghost" disabled={busy||!w.enabled} onClick={()=>businessAction('stop',w.business_id)}>Stop Google review access</button>{admin&&!w.enabled&&<button className="tr-button-ghost" disabled={busy} onClick={()=>businessAction('remove',w.business_id)}>Remove stopped assignment</button>}</div>
 <LiveSettings key={w.business_id+':'+w.settings_version} workspace={w} post={post} refresh={refresh} publishing={!draftOnly&&admin&&!w.owner.startsWith('customer:')&&snapshot.publishingEnabled}/>
 <div className="grid gap-5 lg:grid-cols-2">{w.reviews.filter(r=>reviewFilter==='all'||(reviewFilter==='unanswered'?!r.data.reviewReply?.comment:reviewFilter==='drafts'?Boolean(r.draft)&&r.approved_version!==r.version:r.approved_version===r.version)).map(r=><LiveCard key={r.id+':'+r.version+':'+r.publish_state} review={r} post={post} refresh={refresh} aiAllowed={w.ai_consent} active={w.enabled&&w.connected} canPublish={!draftOnly&&admin&&!w.owner.startsWith('customer:')&&snapshot.publishingEnabled}/>)}</div>
 {w.moreReviews&&<button className="tr-button-ghost mt-4" disabled={busy} onClick={()=>moreReviews(w)}>Load more Google reviews</button>}{!w.reviews.length&&<p className="mt-4 text-sm">No cached Google reviews. Sync to read the latest reviews.</p>}<p className="mt-4 text-xs text-muted">Cached Google content expires after 30 days. To end management on Google itself, contact <a className="underline" href="mailto:support@taprater.com">support@taprater.com</a> or remove Tap Rater in your Google Business Profile access settings.</p>
 </section>)}</section>;
}
