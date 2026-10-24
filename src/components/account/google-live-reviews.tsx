"use client";
import {ReviewScheduleSettings} from './review-schedule-settings';
import {ReviewAutomationControls} from './review-automation-controls';
import {Star,X,Settings,RefreshCw} from 'lucide-react';
import {useEffect,useState,useRef} from 'react';
import {ModalDialog} from '@/components/ui/modal-dialog';
import {GoogleConnectionWizard} from './google-connection-wizard';
import {importReviewPages} from '@/lib/google-business/import-pages';
import {replyStyles,type ReplyStyle,type ReplySuggestions} from '@/lib/review-ai-options';
import type {GoogleReview} from '@/lib/google-business/client';
type Row={scheduled_at?:string|null;suspected_spam?:boolean;id:string;data:GoogleReview;draft:string;version:number;approved_version?:number|null;publish_state:string};
type Workspace={draft_low_stars?:boolean;reply_delay_minutes?:number;review_total?:number|null;imported_count?:number;ai_monthly_limit?:number;ai_monthly_used?:number;owner:string;business_id:string;business_name:string;title:string;enabled:boolean;connected:boolean;synced_at:string|null;next_page:string|null;last_error:string|null;ai_consent:boolean;auto_enabled:boolean;auto_four:boolean;auto_five:boolean;auto_style:ReplyStyle;settings_version:number;draft_error?:string|null;draft_checked_at?:string|null;moreReviews:boolean;reviews:Row[]};
type Snapshot={workspaces:Workspace[];publishingEnabled:boolean;businesses?:{id:string;business_name:string;email:string}[]};
type Post=(body:unknown)=>Promise<Record<string,unknown>>;
const ratings:Record<string,number>={ONE:1,TWO:2,THREE:3,FOUR:4,FIVE:5};
function reviewerName(review:Row){return review.data.reviewer?.isAnonymous?'Anonymous':review.data.reviewer?.displayName||'Google reviewer';}
function ReviewAvatar({name}:{name:string}){return <span className="tr-review-avatar" aria-hidden="true">{name.split(/\s+/).slice(0,2).map(word=>word[0]).join('').toUpperCase()}</span>;}
function ReviewStars({rating}:{rating:string}){const value=ratings[rating]||0;return <span className="tr-review-stars" aria-label={value?`${value} out of 5 stars`:'Rating unavailable'}>{Array.from({length:5},(_,i)=><Star key={i} size={20} strokeWidth={1.4} fill="currentColor" className={i<value?'':'is-empty'} aria-hidden="true"/>)}</span>;}
function reviewDate(review:Row){const value=review.data.createTime||review.data.updateTime;if(!value)return 'Date unavailable';const date=new Date(value);return Number.isNaN(date.getTime())?'Date unavailable':date.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',timeZone:'America/New_York'});}
function matchesReview(review:Row,filter:string){
 if(filter==='all')return true;
 if(filter==='spam')return Boolean(review.suspected_spam);
 if(review.suspected_spam)return false;
 return filter==='unanswered'?!review.data.reviewReply?.comment:filter==='drafts'?Boolean(review.draft)&&review.publish_state!=='published'&&review.approved_version!==review.version:filter==='replied'?Boolean(review.data.reviewReply?.comment):Boolean(review.draft)&&review.publish_state!=='published'&&review.approved_version===review.version;
}
function LiveCard({review,post,refresh,canPublish,aiAllowed,active,onState}:{review:Row;post:Post;refresh:()=>Promise<void>;canPublish:boolean;aiAllowed:boolean;active:boolean;onState?:(dirty:boolean,busy:boolean)=>void}){
 const [draft,setDraft]=useState(review.draft),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[suggestions,setSuggestions]=useState<ReplySuggestions|null>(null);
 const dirty=draft.trim()!==review.draft,unresolved=['publishing','uncertain'].includes(review.publish_state);
 useEffect(()=>{onState?.(dirty,busy);},[dirty,busy,onState]);
 async function action(kind:'save'|'suggest'|'publish'|'reconcile'|'approve'|'spam'){
  if(kind==='publish'&&!window.confirm('Publish this exact saved reply publicly on Google? It will replace the current business reply if one exists.'))return;
  setBusy(true);setMessage('');
  try{
   const result=await post({action:kind,id:review.id,...(kind==='spam'?{spam:!review.suspected_spam,version:review.version}:kind==='save'?{draft,version:review.version}:kind==='publish'?{version:review.version,confirmPublicReply:true}:kind==='approve'?{version:review.version}:{})});
   if(kind==='suggest')setSuggestions(result.suggestions as ReplySuggestions);
   else{await refresh();setMessage(kind==='reconcile'?(result.published?'Google confirms this reply is published.':result.resolved?'Result refreshed. Review the current Google reply before deciding whether to publish again.':'The result is still uncertain. Wait five minutes before checking again.'):'Saved successfully.');}
  }catch(e){setMessage(e instanceof Error?e.message:'Request failed.');if(kind==='publish')await refresh();}finally{setBusy(false);}
 }
 return <article className="tr-review-detail">
  <div className="tr-review-identity"><ReviewAvatar name={reviewerName(review)}/><img src="/brand/google-g.png" alt="Google" width="20" height="20"/><div><strong>{reviewerName(review)}</strong><time>{reviewDate(review)}</time></div><ReviewStars rating={review.data.starRating}/></div>
  <div className="my-3 flex flex-wrap items-center gap-3"><button className="tr-button-ghost" disabled={busy||dirty||unresolved||!active} onClick={()=>action('spam')}>{review.suspected_spam?'Remove spam flag':'Mark as suspected spam'}</button><span className="text-xs text-muted">Private flag only. Does not report or remove the review on Google.</span></div>{review.suspected_spam&&<p role="status" className="rounded border border-amber-300 bg-amber-50 p-3 text-sm">Suspected spam · AI drafting and approval are paused. Your saved draft is preserved.</p>}
  <section className="tr-review-detail-section"><h3>Review</h3><p>{review.data.comment||'Rating only; no written review.'}</p></section>
  <section className="tr-review-detail-section"><h3>Existing reply</h3><div className="tr-existing-reply">{review.data.reviewReply?.comment||<em>No reply yet.</em>}</div></section>
  <section className="tr-review-detail-section tr-draft-editor"><label htmlFor={'live-'+review.id}>Your reply (draft)</label><textarea id={'live-'+review.id} maxLength={4000} value={draft} disabled={busy||unresolved||!active||review.suspected_spam} onChange={e=>setDraft(e.target.value)}/><span className="tr-draft-count">{draft.length.toLocaleString()}/4,000</span></section>
  <details className="tr-ai-reply-tools"><summary>AI reply suggestions</summary><button className="tr-button-ghost mt-2" disabled={busy||!aiAllowed||!active||unresolved||review.suspected_spam} onClick={()=>action('suggest')}>Suggest four replies with AI</button>{!aiAllowed&&<p>Enable AI in this location’s draft settings first.</p>}{suggestions&&<div className="mt-3 grid gap-3 sm:grid-cols-2">{Object.entries(replyStyles).map(([key,label])=><div className="rounded border p-3" key={key}><strong>{label}</strong><p>{suggestions[key as ReplyStyle]}</p><button className="underline" disabled={busy||unresolved} onClick={()=>{if(!draft.trim()||window.confirm('Replace the unsaved reply text with this suggestion?'))setDraft(suggestions[key as ReplyStyle]);}}>Use {label}</button></div>)}</div>}</details>
  {review.scheduled_at&&<p className="text-sm">Scheduled for {new Date(review.scheduled_at).toLocaleString()} <button className="tr-button-ghost" disabled={busy} onClick={async()=>{await post({action:"cancelScheduled",id:review.id});await refresh();}}>Cancel scheduled reply</button></p>}<div className="tr-review-detail-actions"><button className="tr-button-ghost" disabled={busy||unresolved||!active||review.suspected_spam} onClick={()=>action('save')}>Save draft</button><button className="tr-button-primary" disabled={busy||dirty||!draft.trim()||unresolved||!active||review.suspected_spam||review.approved_version===review.version} onClick={()=>action('approve')}>{review.approved_version===review.version?'Draft approved':'Approve draft only'}</button>{canPublish&&<button disabled={busy||dirty||!draft.trim()||unresolved||!active||review.suspected_spam||review.publish_state==='published'} onClick={()=>action('publish')} className="tr-button-primary">Submit to Google</button>}{unresolved&&<button disabled={busy||!active} onClick={()=>action('reconcile')}>Check publish result</button>}</div>
  {dirty&&<p className="tr-draft-notice">Save your changes before approval.</p>}{message&&<p role="status" className="tr-draft-notice">{message}</p>}
 </article>;
}

function ReviewListRow(props:Parameters<typeof LiveCard>[0]){
 const {review}=props;
 const dialog=useRef<HTMLDialogElement>(null),edits=useRef({dirty:false,busy:false});
 const [open,setOpen]=useState(false);
 useEffect(()=>{if(open)dialog.current?.showModal();},[open]);
 function close(){if(edits.current.busy)return;if(edits.current.dirty&&!window.confirm('Discard unsaved reply changes?'))return;dialog.current?.close();setOpen(false);}
 const name=reviewerName(review);
 const status=review.scheduled_at?'Scheduled · '+new Date(review.scheduled_at).toLocaleString():review.suspected_spam?'Suspected spam':review.publish_state==='published'&&review.data.reviewReply?.comment?'Replied':review.draft?(review.approved_version===review.version?'Approved':'Draft'):review.data.reviewReply?.comment?'Replied':'Awaiting reply';
 return <tr className={"tr-review-row"+(review.suspected_spam?" bg-amber-50":"")} onClick={e=>{if(!(e.target as HTMLElement).closest('button,dialog'))setOpen(true);}}>
 <th scope="row"><div className="tr-review-person"><ReviewAvatar name={name}/><img src="/brand/google-g.png" width="18" height="18" alt="Google"/><span className="tr-review-name">{name}</span></div></th>
 <td><ReviewStars rating={review.data.starRating}/></td>
 <td><span className="tr-review-excerpt">{review.data.comment||'Rating only; no written review.'}</span></td>
 <td><span className={'tr-review-status status-'+status.toLowerCase().replace(' ','-')}>{status}</span></td>
 <td className="tr-review-date">{reviewDate(review)}</td>
 <td><button className="tr-button-ghost" aria-label={'Open review from '+name} onClick={()=>setOpen(true)}>Open</button>
 {open&&<dialog ref={dialog} className="tr-review-dialog" aria-label={'Review and reply draft from '+name} onCancel={e=>{e.preventDefault();close();}} onClick={e=>{if(e.target===dialog.current)close();}} onClose={()=>setOpen(false)}>
 <header><h2>Review details</h2><button aria-label="Close review details" onClick={close} autoFocus><X size={24}/></button></header>
 <LiveCard {...props} key={review.version+':'+review.publish_state} onState={(dirty,busy)=>{edits.current={dirty,busy};}}/>
 </dialog>}</td></tr>;
}
function LiveSettings({workspace:w,post,refresh,children}:{workspace:Workspace;post:Post;refresh:()=>Promise<void>;publishing:boolean;children?:React.ReactNode}){
 const [open,setOpen]=useState(false);
 const [ai,setAi]=useState(w.ai_consent),[style,setStyle]=useState(w.auto_style),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 async function save(){
  setBusy(true);setMessage('');try{await post({action:'settings',settings:{businessId:w.business_id,aiConsent:ai,autoEnabled:ai&&w.auto_enabled,four:w.auto_four,five:w.auto_five,style,version:w.settings_version,confirmAutomaticPosting:ai&&w.auto_enabled}});await refresh();setMessage('Review settings saved.');}catch(e){setMessage(e instanceof Error?e.message:'Settings could not be saved.');}finally{setBusy(false);}
 }
 function close(){if(busy)return;if((ai!==w.ai_consent||style!==w.auto_style)&&!window.confirm('Discard unsaved review settings?'))return;setAi(w.ai_consent);setStyle(w.auto_style);setOpen(false);}
 return <><button className="tr-button-ghost" onClick={()=>setOpen(true)}><Settings size={14}/>Settings</button>{open&&<ModalDialog labelledBy={'review-settings-'+w.business_id} onClose={close}><div className="tr-listing-dialog"><header><h2 id={'review-settings-'+w.business_id} tabIndex={-1} data-dialog-heading>Review settings · {w.business_name}</h2><button disabled={busy} aria-label="Close review settings" onClick={close}><X size={20}/></button></header>
 <ReviewScheduleSettings businessId={w.business_id}/><p className="mt-2 text-sm">New reviews are checked regularly in the background.</p>
 <p className="mt-2 text-xs text-muted">Last import: {w.synced_at?new Date(w.synced_at).toLocaleString():'Not completed'} · Last automatic draft check: {w.draft_checked_at?new Date(w.draft_checked_at).toLocaleString():'Not yet confirmed'}. Refresh this page for the latest status.</p>
 <p className="mt-2 text-sm">Monthly AI allowance: {w.ai_monthly_used??0} / {w.ai_monthly_limit??0} attempts used · shared with profile improvements.</p>
 <fieldset disabled={busy||!w.enabled||!w.connected} className="mt-3 space-y-3">
 <label className="flex gap-2 text-sm"><input type="checkbox" checked={ai} onChange={e=>setAi(e.target.checked)}/>Use AI to prepare reply drafts from this location’s review text and ratings.</label>
 <label>Reply style <select className="rounded border p-2" value={style} onChange={e=>setStyle(e.target.value as ReplyStyle)}>{Object.entries(replyStyles).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
 <p className="text-xs text-muted">Review every draft before approval. Existing replies and saved drafts are preserved.</p>
 <button className="tr-button-ghost" onClick={save}>Save settings</button></fieldset>
 {w.draft_error&&<p role="status" className="mt-3 text-sm text-amber-800">{w.draft_error}</p>}
 <p role="status" className="mt-2 text-sm">{message}</p><details className="mt-4 text-xs text-muted"><summary className="cursor-pointer">Import limits & privacy</summary><p className="mt-2">AI uses this location’s monthly package allowance, shared with profile improvements, with a daily safety limit of 20 review generations. Remaining reviews wait for the next available run. Imported Google content is retained for up to 30 days and refreshed while connected. <a href="/privacy-policy" className="underline">Privacy policy</a></p></details><details className="mt-4 text-sm"><summary className="cursor-pointer">Google connection</summary><div className="mt-3">{children}</div><p className="mt-2 text-xs text-muted">To remove Tap Rater’s manager access, use Google Business Profile’s People and access settings or <a className="underline" href="mailto:support@taprater.com">contact support</a>.</p></details></div></ModalDialog>}</>;
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
 const [manageConnectionOpen,setManageConnectionOpen]=useState(()=>typeof window!=='undefined'&&new URLSearchParams(window.location.search).has('connection')&&new URLSearchParams(window.location.search).get('location')===businessId);
 const [importDialog,setImportDialog]=useState<{id:string;name:string;done:boolean}|null>(null);
 const [reviewFilter,setReviewFilter]=useState('all');
 const inScope=(id:string)=>(!businessId||id===businessId)&&(!businessIds||businessIds.includes(id));
 const endpoint=admin?'/api/admin/google-business/reviews':'/api/account/reviews/live';
 const mounted=useRef(true),importing=useRef(false);
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
  setBusy(true);setError('');try{if(action==='sync'){if(importing.current)return;importing.current=true;const workspace=snapshot?.workspaces.find(w=>w.business_id===businessId);setImportDialog({id:businessId,name:workspace?.title||workspace?.business_name||'your business',done:false});setManageConnectionOpen(false);await importReviewPages(async()=>{const result=await post({action,businessId}) as {imported:number;more:boolean};if(mounted.current)await refresh();return result;},()=>{},undefined,()=>!mounted.current);if(mounted.current)setImportDialog(current=>current?.id===businessId?{...current,done:true}:current);}else await post({action,businessId});if(mounted.current)await refresh();}catch(e){if(mounted.current)setError(e instanceof Error?e.message:'Request failed.');}finally{importing.current=false;if(mounted.current)setBusy(false);}
 }
 const importWorkspace=snapshot?.workspaces.find(w=>w.business_id===importDialog?.id);
 const imported=Number(importWorkspace?.imported_count||0),total=importWorkspace?.review_total;
 const percent=importDialog?.done?100:typeof total==='number'&&total>0?Math.min(99,Math.floor(imported/total*100)):null;
 return <section aria-label="Live Google reviews" className="tr-review-list"><h2 className="sr-only">Google reviews</h2>

 <p className="sr-only">{draftOnly?'Draft-only workspace. Approve saved drafts for review; nothing is published.':snapshot?.publishingEnabled?'Live publishing activated. Publishing a saved reply requires your confirmation.':'Live publishing disabled. Saved and approved replies remain drafts.'}</p>
 {error&&<p role="alert" className="mt-3 text-sm text-red-700">{error}</p>}{!snapshot&&!error&&<p className="mt-3">Loading Google connection status…</p>}

 <nav className="tr-review-filters" aria-label="Review filters" title="Counts reflect loaded reviews. Load more below to include older reviews.">{[['all','All reviews'],['unanswered','Awaiting reply'],['drafts','Drafts'],['approved','Approved'],['replied','Replied'],['spam','Suspected spam']].map(([key,label])=><button key={key} aria-pressed={reviewFilter===key} onClick={()=>setReviewFilter(key)}>{label} ({snapshot?snapshot.workspaces.filter(w=>inScope(w.business_id)).flatMap(w=>w.reviews).filter(r=>matchesReview(r,key)).length:'…'})</button>)}</nav>
 {admin&&!draftOnly&&snapshot&&<Discovery post={post} refresh={refresh} businesses={snapshot.businesses || []}/>}
 {snapshot?.workspaces.length===0&&<p className="mt-4 text-sm">No live Google business assigned yet. {admin?'After approval, load the managing account’s locations and assign the correct customer.':'Connect your Google business below to import reviews.'}</p>}
 {snapshot?.workspaces.filter(w=>inScope(w.business_id)).map(w=><section key={w.business_id} className="tr-review-workspace"><div className="tr-review-workspace-meta">{!businessId&&<h3>{w.business_name}</h3>}<span>{!w.enabled?'Stopped':!w.connected?'Google reconnection required':''}</span></div>{w.last_error&&<p className="mt-2 text-sm text-red-700">{w.last_error}</p>}

 <div className="my-3 rounded-lg border border-line bg-white p-4"><ReviewAutomationControls key={w.business_id+':'+w.settings_version} location={{...w,id:w.business_id,connected:w.connected&&w.enabled}} onSaved={refresh}/></div><div className="my-3 flex flex-wrap items-center justify-between gap-2"><span className="text-xs text-muted">{w.enabled&&w.connected?'Automatic imports on':'Imports paused'}{w.synced_at?' · Updated '+new Date(w.synced_at).toLocaleString():''}</span><div className="flex gap-2"><button className="tr-button-ghost" disabled={busy||!w.enabled||!w.connected} onClick={()=>businessAction('sync',w.business_id)}><RefreshCw size={14}/>{busy?'Importing…':w.next_page?'Continue import':'Sync reviews'}</button><LiveSettings key={w.business_id+':'+w.settings_version} workspace={w} post={post} refresh={refresh} publishing={false}><button className="tr-button-ghost" disabled={busy||!w.enabled} onClick={()=>businessAction('stop',w.business_id)}>Disconnect review imports</button>{admin&&!w.enabled&&<button className="tr-button-ghost" disabled={busy} onClick={()=>businessAction('remove',w.business_id)}>Remove stopped assignment</button>}</LiveSettings></div></div>
 <div className="tr-review-table-wrap"><table className="tr-review-table"><caption className="sr-only">Google reviews and reply drafts. Open a review to read or edit its draft.</caption><thead><tr><th>Reviewer</th><th>Rating</th><th>Review (excerpt)</th><th>Reply status</th><th>Date</th><th>Open</th></tr></thead><tbody>{w.reviews.filter(r=>matchesReview(r,reviewFilter)).map(r=><ReviewListRow key={r.id} review={r} post={post} refresh={refresh} aiAllowed={w.ai_consent} active={w.enabled&&w.connected} canPublish={!draftOnly&&snapshot.publishingEnabled}/>)}</tbody></table>{w.reviews.length>0&&!w.reviews.some(r=>matchesReview(r,reviewFilter))&&<p className="p-4 text-sm">No reviews match this filter.</p>}</div>

 {w.moreReviews&&<button className="tr-button-ghost mt-4" disabled={busy} onClick={()=>moreReviews(w)}>Load more Google reviews</button>}{!w.reviews.length&&<p className="mt-4 text-sm">No reviews imported yet. Sync reviews to get started.</p>}
 </section>)} {!admin&&snapshot&&<details className="tr-review-settings" open={manageConnectionOpen} onToggle={e=>setManageConnectionOpen(e.currentTarget.open)}><summary>Manage Google connection</summary>{manageConnectionOpen&&<GoogleConnectionWizard key={businessId||'all'} onLinked={async()=>{setManageConnectionOpen(false);const url=new URL(window.location.href);url.searchParams.delete('connection');url.searchParams.delete('step');url.searchParams.delete('reason');window.history.replaceState(null,'',url);await refresh();}} businessId={businessId}/>}</details>}
 {importDialog&&<ModalDialog labelledBy="location-import-title" onClose={()=>setImportDialog(null)}><div className="tr-card flex h-[min(380px,85dvh)] w-[min(680px,calc(100vw-32px))] flex-col p-6"><header className="flex items-center justify-between gap-3"><h2 id="location-import-title" data-dialog-heading tabIndex={-1}>{importDialog.done?'Reviews imported':'Importing reviews'}</h2><button type="button" aria-label="Close import progress" onClick={()=>setImportDialog(null)}><X size={20}/></button></header><div className="flex flex-1 flex-col justify-center"><p className="mb-5 text-center font-semibold">{importDialog.name}</p><div role="status" className="mb-2 flex justify-between text-sm"><span>{imported}{typeof total==='number'?` of ${total}`:''} reviews imported</span><strong>{percent===null?'Preparing…':`${percent}%`}</strong></div><div role="progressbar" aria-label="Review import progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent??undefined} className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full bg-teal-600 ${percent===null?'w-1/3 animate-pulse':''}`} style={percent===null?undefined:{width:`${percent}%`}}/></div>{!importDialog.done&&!error&&<p className="mt-4 text-center text-sm text-muted">You can close this popup. Your reviews will continue importing in the background.</p>}{error&&<p role="alert" className="mt-4 text-sm text-red-700">{error}</p>}</div><footer className="flex justify-end gap-2">{importDialog.done?<button className="tr-button-primary" onClick={()=>setImportDialog(null)}>View reviews</button>:error?<button className="tr-button-primary" disabled={busy} onClick={()=>businessAction('sync',importDialog.id)}>Continue import</button>:<button className="tr-button-ghost" onClick={()=>setImportDialog(null)}>Continue in background</button>}</footer></div></ModalDialog>}
 </section>;
}
