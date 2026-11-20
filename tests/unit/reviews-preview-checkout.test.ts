import {beforeEach,expect,it,vi} from 'vitest';
const m=vi.hoisted(()=>({auth:vi.fn(),access:vi.fn(),preview:vi.fn(),reserve:vi.fn(),prepare:vi.fn(),checkout:vi.fn(),limit:vi.fn(),record:vi.fn(),enabled:vi.fn()}));
vi.mock('@/lib/customer-auth',()=>({requireCustomerApi:m.auth}));
vi.mock('@/lib/customer-marketing-access',()=>({hasCustomerMarketingAccess:m.access}));
vi.mock('@/lib/reviews-purchase-preview',()=>({currentReviewPreview:m.preview,reserveReviewPreview:m.reserve}));
vi.mock('@/lib/marketing-subscriptions',()=>({createMarketingCheckout:m.checkout,prepareMarketingBuyer:m.prepare,marketingCheckoutEnabled:m.enabled}));
vi.mock('@/lib/auth-rate-limit',()=>({checkLoginRateLimit:m.limit,recordLoginAttempt:m.record}));
vi.mock('@/lib/checkout',()=>({getStripeMode:()=> 'test',getCheckoutSiteUrl:()=> 'https://taprater.com',getStripeClient:vi.fn()}));
import {POST} from '@/app/api/account/marketing-subscription/route';
const attempt='11111111-1111-4111-8111-111111111111';
const request=(extra:Record<string,unknown>={},origin='https://taprater.com')=>new Request('https://taprater.com/api/account/marketing-subscription',{method:'POST',headers:{origin},body:JSON.stringify({attempt,previewId:attempt,email:'buyer@example.test',firstName:'Jane',lastName:'Doe',phone:'',cadence:'month',locations:1,acceptedTerms:true,...extra})});
beforeEach(()=>{vi.resetAllMocks();m.auth.mockResolvedValue({session:null});m.enabled.mockReturnValue(true);m.access.mockResolvedValue(false);m.limit.mockResolvedValue({context:{configured:true},limited:false});m.preview.mockResolvedValue({id:attempt,complete:true,verified_name:'Verified business'});m.reserve.mockResolvedValue({id:attempt});m.checkout.mockResolvedValue({url:'https://checkout.stripe.com/fixture'});});
it('requires a complete Google analysis before any buyer or Stripe mutation',async()=>{m.preview.mockResolvedValue({complete:false});expect((await POST(request())).status).toBe(400);expect(m.prepare).not.toHaveBeenCalled();expect(m.checkout).not.toHaveBeenCalled();});
it('saves the customer profile before opening Stripe, keeping business metadata separate',async()=>{expect((await POST(request())).status).toBe(200);expect(m.prepare).toHaveBeenCalledWith('buyer@example.test','Jane Doe',undefined,{firstName:'Jane',lastName:'Doe',phone:''});expect(m.prepare.mock.invocationCallOrder[0]).toBeLessThan(m.checkout.mock.invocationCallOrder[0]);expect(m.reserve).toHaveBeenCalledWith('buyer@example.test',attempt,'test');expect(m.checkout.mock.calls[0][3].metadata).toEqual({marketing_only:'true',reviews_preview_id:attempt});});
it('does not alter an existing Reviews customer or start a duplicate purchase',async()=>{m.auth.mockResolvedValue({session:{email:'existing@example.test'}});m.access.mockResolvedValue(true);expect((await POST(request())).status).toBe(400);expect(m.prepare).not.toHaveBeenCalled();expect(m.reserve).not.toHaveBeenCalled();expect(m.checkout).not.toHaveBeenCalled();});
it('refuses a location already assigned elsewhere before contacting Stripe',async()=>{m.reserve.mockRejectedValue(Error('Already assigned'));expect((await POST(request())).status).toBe(400);expect(m.checkout).not.toHaveBeenCalled();});
it('rejects cross-origin submissions and client-supplied preview identifiers',async()=>{expect((await POST(request({},'https://other.test'))).status).toBe(403);expect((await POST(request({reviews_preview_id:attempt}))).status).toBe(400);expect(m.prepare).not.toHaveBeenCalled();});

it('rejects a stale preview from another tab before reserving or paying',async()=>{expect((await POST(request({previewId:'22222222-2222-4222-8222-222222222222'}))).status).toBe(400);expect(m.prepare).not.toHaveBeenCalled();expect(m.checkout).not.toHaveBeenCalled();});
it('rejects missing names or invalid phone before buyer or Stripe mutation',async()=>{
 for(const extra of [{firstName:''},{lastName:''},{firstName:undefined},{phone:'not a phone'}])expect((await POST(request(extra))).status).toBe(400);
 expect(m.prepare).not.toHaveBeenCalled();expect(m.checkout).not.toHaveBeenCalled();
});
it('uses the signed-in identity and does not accept guest profile changes for it',async()=>{
 m.auth.mockResolvedValue({session:{email:'signed-in@example.test'}});expect((await POST(request())).status).toBe(200);
 expect(m.prepare).toHaveBeenCalledWith('signed-in@example.test','Verified business','signed-in@example.test',undefined);
});
it('does not open Stripe if pending-profile storage fails',async()=>{m.prepare.mockRejectedValue(Error('Storage unavailable'));expect((await POST(request())).status).toBe(400);expect(m.checkout).not.toHaveBeenCalled();});
it('lets a buyer pay before connecting Google, with no preview reserved or passed to Stripe',async()=>{
 expect((await POST(request({previewId:undefined}))).status).toBe(200);
 expect(m.preview).not.toHaveBeenCalled();expect(m.reserve).not.toHaveBeenCalled();
 expect(m.prepare).toHaveBeenCalledWith('buyer@example.test','Jane Doe',undefined,{firstName:'Jane',lastName:'Doe',phone:''});
 expect(m.checkout.mock.calls[0][3].metadata).toEqual({marketing_only:'true'});
});
