import {beforeEach,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({sql:vi.fn(),create:vi.fn()}));
vi.mock('@/lib/google-business/live-reviews',()=>({liveDb:()=>mocks.sql}));
vi.mock('@/lib/checkout',()=>({getStripeMode:()=> 'test',getStripeClient:()=>({billingPortal:{configurations:{create:mocks.create}}})}));
import {reviewsPeriodPortalConfiguration} from '@/lib/reviews-period-portal';
beforeEach(()=>vi.resetAllMocks());
it('uses a dedicated end-of-period portal without editing existing configurations',async()=>{
 mocks.sql.mockResolvedValueOnce([]).mockResolvedValueOnce([{configuration_id:'bpc_new'}]);
 mocks.create.mockResolvedValue({id:'bpc_new'});
 expect(await reviewsPeriodPortalConfiguration()).toBe('bpc_new');
 expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({features:expect.objectContaining({subscription_cancel:{enabled:true,mode:'at_period_end'},subscription_update:{enabled:false}})}),{idempotencyKey:'reviews-period-portal-v1:test'});
});
it('reuses the saved configuration',async()=>{
 mocks.sql.mockResolvedValue([{configuration_id:'bpc_saved'}]);
 expect(await reviewsPeriodPortalConfiguration()).toBe('bpc_saved');
 expect(mocks.create).not.toHaveBeenCalled();
});
