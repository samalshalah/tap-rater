import type {GoogleReview} from './google-business/client';
export type ReviewPreviewAnalysis={reviews:Record<string,{stars:number;unanswered:boolean}>;pages:string[];total:number|null;average:number|null};
export const emptyReviewAnalysis=():ReviewPreviewAnalysis=>({reviews:{},pages:[],total:null,average:null});
export function addReviewPreviewPage(previous:ReviewPreviewAnalysis,page:{reviews:GoogleReview[];nextPageToken?:string;totalReviewCount?:number;averageRating?:number},parent:string){
 const result=structuredClone(previous),stars:Record<string,number>={ONE:1,TWO:2,THREE:3,FOUR:4,FIVE:5};
 for(const review of page.reviews){
  if(!/^[A-Za-z0-9_-]+$/.test(review.reviewId)||review.name&&review.name!==`${parent}/reviews/${review.reviewId}`)throw Error('Google returned a review from a different location.');
  // Store counts and identifiers only, never reviewer names or review text in a preview.
  Object.defineProperty(result.reviews,review.reviewId,{value:{stars:stars[review.starRating]||0,unanswered:!review.reviewReply?.comment?.trim()},enumerable:true,writable:true,configurable:true});
 }
 if(page.nextPageToken){if(result.pages.includes(page.nextPageToken)||result.pages.length>=1000)throw Error('Google could not finish the review analysis. Please restart the preview.');result.pages.push(page.nextPageToken);}
 result.total=page.totalReviewCount??result.total;result.average=page.averageRating??result.average;return result;
}
export function reviewPreviewSummary(analysis:ReviewPreviewAnalysis){
 const reviews=Object.values(analysis.reviews),unanswered=reviews.filter(r=>r.unanswered);
 return {reviewCount:reviews.length,total:analysis.total,average:analysis.average,unanswered:unanswered.length,
  byStars:[1,2,3,4,5].map(stars=>({stars,total:reviews.filter(r=>r.stars===stars).length,unanswered:unanswered.filter(r=>r.stars===stars).length})),unknownStars:unanswered.filter(r=>!r.stars).length};
}
