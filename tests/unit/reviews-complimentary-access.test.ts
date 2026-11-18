import {beforeEach,expect,it,vi} from 'vitest';
const m=vi.hoisted(()=>({sql:vi.fn(),stripe:vi.fn()}));
vi.mock('@/lib/google-business/live-review-core',()=>({liveDb:()=>m.sql}));
vi.mock('@/lib/checkout',()=>({getStripeMode:()=> 'live',getStripeClient:m.stripe}));
import {reviewsBillingSnapshot} from '@/lib/reviews-plan-management';
beforeEach(()=>vi.clearAllMocks());
it('shows complimentary allowance and expiry without Stripe controls or support detours',async()=>{
 m.sql.mockResolvedValue([{id:'qa',access_source:'manual',access_status:'active',access_locations:1,access_expires_at:'2026-12-18',ai_monthly_limit:1000,has_subscription:false}]);
 expect(await reviewsBillingSnapshot('QA@example.test')).toEqual({selfServe:false,access:{kind:'complimentary',status:'active',locations:1,expiresAt:'2026-12-18',drafts:1000}});
 expect(m.stripe).not.toHaveBeenCalled();expect(m.sql.mock.calls[0]).toContain('qa@example.test');
});
it('does not describe an account with a Stripe subscription as complimentary',async()=>{
 m.sql.mockResolvedValue([{id:'existing',access_source:'manual',has_subscription:true}]);
 const data=await reviewsBillingSnapshot('owner@example.test');expect(data).not.toHaveProperty('access');expect(data.selfServe).toBe(false);
});
it('preserves unlimited complimentary access without inventing an expiry',async()=>{
 m.sql.mockResolvedValue([{id:'managed',access_source:'manual',access_status:'active',access_locations:0,unlimited_locations:true,access_expires_at:null,ai_monthly_limit:1000,has_subscription:false}]);
 expect(await reviewsBillingSnapshot('owner@example.test')).toMatchObject({access:{locations:null,expiresAt:null}});
});
