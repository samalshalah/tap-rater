"use client";
import {RefreshCw} from 'lucide-react';
import {LiveSettings} from './google-live-review-settings';
import {GoogleLiveReviewTable} from './google-live-review-table';
import type {Post,Workspace} from './google-live-review-types';
type Props={w:Workspace;businessId?:string;admin:boolean;busy:boolean;draftOnly:boolean;publishingEnabled:boolean;reviewFilter:string;post:Post;refresh:()=>Promise<void>;businessAction:(action:'sync'|'stop'|'remove',businessId:string)=>Promise<void>;moreReviews:(workspace:Workspace)=>Promise<void>};
export function GoogleLiveReviewWorkspace({w,businessId,admin,busy,draftOnly,publishingEnabled,reviewFilter,post,refresh,businessAction,moreReviews}:Props){return <section key={w.business_id} className="tr-review-workspace"><div className="tr-review-workspace-meta">{!businessId&&<h3>{w.business_name}</h3>}<span>{!w.enabled?'Stopped':!w.connected?'Google reconnection required':''}</span></div>{w.last_error&&<p className="mt-2 text-sm text-red-700">{w.last_error}</p>}

 <div className="my-3 flex flex-wrap items-center justify-between gap-2"><span className="text-xs text-muted">{w.enabled&&w.connected?'Automatic review updates on':'Review updates paused'}</span><div className="flex gap-2"><button className="tr-button-ghost" disabled={busy||!w.enabled||!w.connected} onClick={()=>businessAction('sync',w.business_id)}><RefreshCw size={14}/>{busy?(w.initial_import_completed?'Checking…':'Importing…'):w.initial_import_completed?'Check for updates':w.next_page?'Continue import':'Sync reviews'}</button><LiveSettings workspace={w} refresh={refresh}><button className="tr-button-ghost" disabled={busy||!w.enabled} onClick={()=>businessAction('stop',w.business_id)}>Disconnect review imports</button>{admin&&!w.enabled&&<button className="tr-button-ghost" disabled={busy} onClick={()=>businessAction('remove',w.business_id)}>Remove stopped assignment</button>}</LiveSettings></div></div>
 <GoogleLiveReviewTable workspace={w} reviews={w.reviews} reviewFilter={reviewFilter} post={post} refresh={refresh} aiAllowed={w.ai_consent} active={w.enabled&&w.connected} canPublish={!draftOnly&&publishingEnabled}/>

 {w.moreReviews&&<button className="tr-button-ghost mt-4" disabled={busy} onClick={()=>moreReviews(w)}>Load more reviews</button>}{!w.reviews.length&&Number(w.saved_count||0)===0&&<p className="mt-4 text-sm">No reviews imported yet. Sync reviews to get started.</p>}
 </section>;}
