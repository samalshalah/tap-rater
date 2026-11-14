import {afterEach,expect,it,vi} from 'vitest';
vi.mock('next/navigation',()=>({notFound:()=>{throw Error('NOT_FOUND');}}));
vi.mock('@/lib/customer-auth',()=>({requireCustomerApi:vi.fn(async()=>({session:null,response:new Response(null,{status:401})}))}));
vi.mock('@/lib/checkout',()=>({getCheckoutSiteUrl:()=> 'https://taprater.com',getStripeMode:()=> 'test',getStripeClient:vi.fn(()=>{throw Error('Stripe must not be contacted while sales are paused');})}));
import Page from '@/app/google-reviews/packages/page';
import {POST} from '@/app/api/account/marketing-subscription/route';
import {marketingCheckoutEnabled} from '@/lib/marketing-subscriptions';
import {businessOptimizationEnabled} from '@/lib/business-optimization-feature';
afterEach(()=>vi.unstubAllEnvs());
it('keeps Reviews packages and checkout closed even when environment switches are enabled',async()=>{
 vi.stubEnv('MARKETING_CHECKOUT_ENABLED','true');vi.stubEnv('MARKETING_PORTAL_CONFIGURATION_ID','default');
 expect(marketingCheckoutEnabled()).toBe(false);
 await expect(Page({searchParams:Promise.resolve({})})).rejects.toThrow('NOT_FOUND');
 const result=await POST(new Request('https://taprater.com/api/account/marketing-subscription',{method:'POST',headers:{origin:'https://taprater.com'},body:'{}'}));
 expect(result.status).toBe(503);expect(await result.json()).toEqual({error:'New package subscriptions are currently unavailable.'});
 expect(businessOptimizationEnabled).toBe(false);
});
