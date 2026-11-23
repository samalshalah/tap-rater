import {expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
vi.mock('@/lib/google-business/live-reviews',()=>({liveDb:()=>vi.fn()}));
import {releaseEndedReviewsAccess,notifyReviewsAccessEnded} from '@/lib/reviews-access-release';

it('releases ended accounts without deleting reviews, then removes unused stored Google sign-ins',async()=>{
 const sql=vi.fn().mockResolvedValueOnce([{business_id:'b1',customer_id:'c1',owner:'customer:x:location:b1',account_ended:true,unscheduled:3}]).mockResolvedValueOnce([{owner:'customer:x:location:b1'}])
  .mockResolvedValueOnce([{email:'client@example.com',name:'Client',first_name:'Sam',businesses:'University Barber Shop'}]);
 const send=vi.fn().mockResolvedValue({sent:true});
 expect(await releaseEndedReviewsAccess(sql as never,{send,env:{}})).toEqual({released:1,removedLocations:0,connections:1,emailed:1});
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
 expect(await releaseEndedReviewsAccess(sql as never)).toEqual({released:0,removedLocations:0,connections:0,emailed:0});
 expect(sql).toHaveBeenCalledTimes(1);
});
it('treats released links as free in every "already connected" check and lets a reconnect reclaim the link',()=>{
 const read=(f:string)=>readFileSync(f,'utf8');
 for(const f of ['src/lib/reviews-preview-setup.ts','src/lib/reviews-purchase-preview.ts'])
  for(const check of (read(f).match(/SELECT business_id FROM google_review_links WHERE[^`]+/g)||[]).filter(q=>q.includes('split_part')))expect(check).toContain('reconnected_to IS NULL');
 expect(read('src/lib/google-business/live-review-workspaces.ts')).toContain('enabled=true,reconnected_to=NULL,');
});

it('releases a location removed at renewal from a plan that keeps running, without emailing or reopening setup',async()=>{
 const sql=vi.fn().mockResolvedValueOnce([{business_id:'b2',customer_id:'c2',owner:'customer:y:location:b2',account_ended:false,unscheduled:0}]).mockResolvedValueOnce([]);
 const send=vi.fn();
 expect(await releaseEndedReviewsAccess(sql as never,{send,env:{}})).toEqual({released:1,removedLocations:1,connections:0,emailed:0});
 expect(send).not.toHaveBeenCalled();
 const release=sql.mock.calls[0][0].join('');
 // Only plan-change removals whose licence is still off, and never for an account that ended (handled above).
 expect(release).toContain('FROM reviews_applied_plan_changes p CROSS JOIN LATERAL jsonb_array_elements_text(p.removed_ids)');
 expect(release).toContain('AND NOT m.enabled');
 expect(release).toContain('WHERE p.customer_id NOT IN (SELECT customer_id FROM ended)');
 expect(release).toContain('marketing_onboarding_completed_at=NULL FROM (SELECT DISTINCT customer_id FROM links WHERE account_ended)');
});
it('emails the client once per day when their access ends, with a copy for the store',async()=>{
 const sql=vi.fn().mockResolvedValue([{email:'client@example.com',name:'Client Name',first_name:'Sam',businesses:'University Barber Shop'}]);
 const send=vi.fn().mockResolvedValue({sent:true});
 await notifyReviewsAccessEnded({account:'c1',sql:sql as never,send,env:{ORDER_NOTIFICATION_EMAIL:'order@taprater.com'},now:new Date('2026-12-20T15:00:00Z')});
 const [client,admin]=send.mock.calls.map(([input])=>input);
 expect(client.to).toBe('client@example.com');
 expect(client.subject).toBe('Your Google Reviews subscription has ended');
 expect(client.html).toContain('Hi Sam');
 expect(client.html).toContain('December 20, 2026');
 expect(client.html).toContain('University Barber Shop has been disconnected');
 expect(client.html).toContain('30 days');
 expect(client.html).toContain('/google-reviews#plan');
 expect(client.delivery.idempotencyKey).toBe('reviews_access_ended_customer:c1:2026-12-20');
 expect(admin.to).toBe('order@taprater.com');
 expect(admin.replyTo).toBe('client@example.com');
 expect(admin.delivery.idempotencyKey).toBe('reviews_access_ended_admin:c1:2026-12-20');
});
it('never lets an email problem stop the release',async()=>{
 const sql=vi.fn().mockResolvedValueOnce([{business_id:'b1',customer_id:'c1',owner:'o1',account_ended:true,unscheduled:0}]).mockResolvedValueOnce([]).mockRejectedValueOnce(new Error('db hiccup'));
 expect(await releaseEndedReviewsAccess(sql as never,{send:vi.fn(),env:{}})).toEqual({released:1,removedLocations:0,connections:0,emailed:0});
});
