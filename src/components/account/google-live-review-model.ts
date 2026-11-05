import type { Row,Snapshot,Workspace } from './google-live-review-types';

export function matchesReview(review:Row,filter:string,_workspace:Workspace){
 return filter==='all'||reviewStatus(review)===filter;
}

export function reviewStatus(review:Row){
 if(review.suspected_spam)return 'spam';
 if(review.data.reviewReply?.comment||review.publish_state==='published')return 'replied';
 if(review.publish_state==='publishing'||review.publish_state==='uncertain')return 'attention';
 if(review.scheduled_at&&review.publish_state==='idle')return 'queued';
 if(review.draft&&review.publish_state==='idle'&&review.approved_version===review.version)return 'approved';
 if(review.draft&&review.publish_state==='idle'&&review.approved_version!==review.version)return 'drafts';
 return 'unanswered';
}

export const reviewFilters = [['all','All reviews'],['unanswered','Needs reply'],['queued','Scheduled'],['drafts','Draft'],['approved','Approved'],['attention','Checking reply'],['replied','Replied'],['spam','Suspected spam']] as const;

// Only exclude IDs already in the first list; retain ordering and duplicates within either list.
export function appendUnseenReviews(existing: Row[], incoming: Row[]): Row[] {
  const ids = new Set(existing.map(review => review.id));
  return [...existing, ...incoming.filter(review => !ids.has(review.id))];
}

export function mergeReviewSnapshot(data: Snapshot, previous: Snapshot | null, preserveLoaded: boolean): Snapshot {
  if (!preserveLoaded || !previous) return data;
  const byBusiness = new Map<string, Workspace>();
  for (const workspace of previous.workspaces) {
    if (!byBusiness.has(workspace.business_id)) byBusiness.set(workspace.business_id, workspace);
  }
  return { ...data, workspaces: data.workspaces.map(workspace => {
    const old = byBusiness.get(workspace.business_id);
    return old && old.reviews.length > 100
      ? { ...workspace, reviews: appendUnseenReviews(workspace.reviews, old.reviews), moreReviews: old.moreReviews }
      : workspace;
  }) };
}

export function scopeReviewWorkspaces(workspaces: Workspace[], businessId?: string, businessIds?: string[]) {
  const allowed = businessIds ? new Set(businessIds) : null;
  return workspaces.filter(workspace => (!businessId || workspace.business_id === businessId) && (!allowed || allowed.has(workspace.business_id)));
}

export function countReviewFilters(workspaces: Workspace[]): Record<string, number> {
  const counts: Record<string, number> = Object.fromEntries(reviewFilters.map(([key]) => [key, 0]));
  for (const workspace of workspaces) {
    if(workspace.review_counts){for(const [key] of reviewFilters)counts[key]+=workspace.review_counts[key]||0;continue;}
    for (const review of workspace.reviews) for (const [key] of reviewFilters) if (matchesReview(review, key, workspace)) counts[key]++;
  }
  return counts;
}

export function nextQueueCheck(r:Row,w:Workspace){
 const positive=r.data.starRating==='FIVE'?w.auto_five:r.data.starRating==='FOUR'&&w.auto_four;
 const enrolled=Boolean(r.old_reply_requested_at)||(Boolean(w.consent_at&&r.data.createTime)&&Date.parse(r.data.createTime!)>Date.parse(w.consent_at!));
 return w.enabled&&w.connected&&w.ai_consent&&w.auto_enabled&&positive&&enrolled&&!r.suspected_spam&&!r.auto_schedule_cancelled
  &&r.publish_state==='idle'&&!r.draft&&!r.draft_generated_at&&r.approved_version==null&&!r.scheduled_at&&!r.data.reviewReply?.comment?w.draft_due_at:null;
}
