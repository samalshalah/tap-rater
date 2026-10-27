"use client";
import {memo,useMemo} from 'react';
import {ReviewListRow} from './google-live-review-row';
import {matchesReview} from './google-live-review-model';
import type {Post,Row} from './google-live-review-types';
type Props={reviews:Row[];reviewFilter:string;post:Post;refresh:()=>Promise<void>;aiAllowed:boolean;active:boolean;canPublish:boolean};
export const GoogleLiveReviewTable=memo(function GoogleLiveReviewTable({reviews,reviewFilter,post,refresh,aiAllowed,active,canPublish}:Props){
 const visibleReviews=useMemo(()=>reviews.filter(review=>matchesReview(review,reviewFilter)),[reviews,reviewFilter]);
 return <div className="tr-review-table-wrap"><table className="tr-review-table"><caption className="sr-only">Google reviews and reply drafts. Open a review to read or edit its draft.</caption><thead><tr><th>Reviewer</th><th>Rating</th><th>Review (excerpt)</th><th>Reply status</th><th>Date</th><th>Open</th></tr></thead><tbody>{visibleReviews.map(r=><ReviewListRow key={r.id} review={r} post={post} refresh={refresh} aiAllowed={aiAllowed} active={active} canPublish={canPublish}/>)}</tbody></table>{reviews.length>0&&visibleReviews.length===0&&<p className="p-4 text-sm">No reviews match this filter.</p>}</div>;
});
