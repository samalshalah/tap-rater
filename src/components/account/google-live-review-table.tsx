"use client";
import {memo,useMemo} from 'react';
import {Bot,CircleHelp,History} from 'lucide-react';
import {ReviewListRow} from './google-live-review-row';
import {matchesReview,matchesReviewRating} from './google-live-review-model';
import type {Post,Row,Workspace} from './google-live-review-types';
type Props={workspace:Workspace;reviews:Row[];reviewFilter:string;ratingFilter?:string;post:Post;refresh:()=>Promise<void>;aiAllowed:boolean;active:boolean;canPublish:boolean};
export const GoogleLiveReviewTable=memo(function GoogleLiveReviewTable({workspace,reviews,reviewFilter,ratingFilter='all',post,refresh,aiAllowed,active,canPublish}:Props){
 const visibleReviews=useMemo(()=>reviews.filter(review=>matchesReview(review,reviewFilter,workspace)&&matchesReviewRating(review,ratingFilter)),[reviews,reviewFilter,ratingFilter,workspace]);
 const hasTapRater=visibleReviews.some(r=>Boolean(r.data.reviewReply?.comment)&&r.publish_state==='published'&&Boolean(r.attempted_at));
 const hasGoogleExisting=visibleReviews.some(r=>Boolean(r.data.reviewReply?.comment)&&!(r.publish_state==='published'&&r.attempted_at)&&workspace.consent_at&&r.data.updateTime&&Date.parse(r.data.updateTime)<=Date.parse(workspace.consent_at));
 const hasOther=visibleReviews.some(r=>Boolean(r.data.reviewReply?.comment)&&!(r.publish_state==='published'&&r.attempted_at)&&!(workspace.consent_at&&r.data.updateTime&&Date.parse(r.data.updateTime)<=Date.parse(workspace.consent_at)));
 return <div className="tr-review-table-wrap">{(hasTapRater||hasGoogleExisting||hasOther)&&<div className="tr-review-source-legend" aria-label="Reply source legend">{hasTapRater&&<span><Bot size={13} aria-hidden="true"/> Posted by Tap Rater</span>}{hasGoogleExisting&&<span><History size={13} aria-hidden="true"/> Already on Google</span>}{hasOther&&<span><CircleHelp size={13} aria-hidden="true"/> On Google · source unconfirmed</span>}</div>}<table className="tr-review-table"><caption className="sr-only">Google reviews and reply drafts. Select a review row to open its details.</caption><thead><tr><th>Reviewer</th><th>Rating</th><th>Review (excerpt)</th><th>Reply status</th><th>Review date</th></tr></thead><tbody>{visibleReviews.map(r=><ReviewListRow key={r.id} review={r} workspace={workspace} consentAt={workspace.consent_at} post={post} refresh={refresh} aiAllowed={aiAllowed} active={active} canPublish={canPublish}/>)}</tbody></table>{visibleReviews.length===0&&reviews.length>0&&<p className="p-4 text-sm">No reviews match these filters.</p>}</div>;
});
