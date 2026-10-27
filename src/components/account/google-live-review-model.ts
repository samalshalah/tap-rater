import type { Row,Snapshot,Workspace } from './google-live-review-types';

export function matchesReview(review:Row,filter:string){
 if(filter==='all')return true;
 if(filter==='spam')return Boolean(review.suspected_spam);
 if(review.suspected_spam)return false;
 return filter==='unanswered'?!review.data.reviewReply?.comment:filter==='drafts'?Boolean(review.draft)&&review.publish_state!=='published'&&review.approved_version!==review.version:filter==='replied'?Boolean(review.data.reviewReply?.comment):Boolean(review.draft)&&review.publish_state!=='published'&&review.approved_version===review.version;
}

export const reviewFilters = [['all','All reviews'],['unanswered','Awaiting reply'],['drafts','Drafts'],['approved','Approved'],['replied','Replied'],['spam','Suspected spam']] as const;

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
  for (const workspace of workspaces) for (const review of workspace.reviews) {
    for (const [key] of reviewFilters) if (matchesReview(review, key)) counts[key]++;
  }
  return counts;
}
