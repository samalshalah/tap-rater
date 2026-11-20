import {expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
vi.mock('@/lib/google-business/live-reviews',()=>({liveDb:()=>vi.fn()}));
import {releaseEndedReviewsAccess} from '@/lib/reviews-access-release';

it('releases ended accounts without deleting reviews, then removes unused stored Google sign-ins',async()=>{
 const sql=vi.fn().mockResolvedValueOnce([{business_id:'b1',customer_id:'c1',owner:'customer:x:location:b1',unscheduled:3}]).mockResolvedValueOnce([{owner:'customer:x:location:b1'}]);
 expect(await releaseEndedReviewsAccess(sql as never)).toEqual({released:1,connections:1});
 const release=sql.mock.calls[0][0].join('');
 expect(release).toContain("m.status IN ('canceled','unpaid','incomplete_expired')");
 expect(release).toContain("NOT EXISTS(SELECT 1 FROM marketing_subscriptions m WHERE m.customer_id=a.customer_id AND m.status IN ('active','trialing','past_due','incomplete'))");
 expect(release).toContain('reconnected_to=l.business_id');
 expect(release).toContain('marketing_onboarding_completed_at=NULL');
 expect(release).toContain('scheduled_at=NULL');
 expect(release).not.toMatch(/DELETE FROM google_review_links/);
 const connections=sql.mock.calls[1][0].join('');
 expect(connections).toContain('DELETE FROM google_business_connections');
 expect(connections).toContain('NOT EXISTS(SELECT 1 FROM google_review_links l WHERE l.owner=g.owner AND l.reconnected_to IS NULL)');
 expect(connections).not.toContain('revoke');
});
it('does nothing more when no account has ended',async()=>{
 const sql=vi.fn().mockResolvedValueOnce([]);
 expect(await releaseEndedReviewsAccess(sql as never)).toEqual({released:0,connections:0});
 expect(sql).toHaveBeenCalledTimes(1);
});
it('treats released links as free in every "already connected" check and lets a reconnect reclaim the link',()=>{
 const read=(f:string)=>readFileSync(f,'utf8');
 for(const f of ['src/lib/reviews-preview-setup.ts','src/lib/reviews-purchase-preview.ts'])
  for(const check of (read(f).match(/SELECT business_id FROM google_review_links WHERE[^`]+/g)||[]).filter(q=>q.includes('split_part')))expect(check).toContain('reconnected_to IS NULL');
 expect(read('src/lib/google-business/live-review-workspaces.ts')).toContain('enabled=true,reconnected_to=NULL,');
});
