import {expect,it,vi,afterEach} from 'vitest';
const m=vi.hoisted(()=>({single:vi.fn(),cookie:vi.fn()}));
vi.mock('next/headers',()=>({cookies:async()=>({get:()=>({value:m.cookie()})})}));
vi.mock('@/lib/db',()=>({hasSupabaseAdminConfig:()=>true,getSupabaseAdmin:()=>({from:()=>({select:()=>({eq:()=>({maybeSingle:m.single})})})})}));
import {requireCustomerApi,createCustomerSessionValue} from '@/lib/customer-auth';
import {withServerTiming} from '@/lib/server-timing';
afterEach(()=>{delete process.env.CUSTOMER_SESSION_SECRET;vi.clearAllMocks();});
it('validates once within a GET and honors session revocation on the next request',async()=>{
 process.env.CUSTOMER_SESSION_SECRET='request-test-only';m.cookie.mockReturnValue(createCustomerSessionValue('owner@example.test'));m.single.mockResolvedValue({data:{account_status:'active'},error:null});
 const run=()=>withServerTiming(new Request('https://example.test/api/account/local'),async()=>{const [a,b]=await Promise.all([requireCustomerApi(),requireCustomerApi()]);expect(a).toBe(b);return a.response||Response.json({authenticated:true});});
 expect((await run()).status).toBe(200);expect(m.single).toHaveBeenCalledTimes(1);
 m.single.mockResolvedValue({data:{account_status:'disabled'},error:null});expect((await run()).status).toBe(401);expect(m.single).toHaveBeenCalledTimes(2);
});
