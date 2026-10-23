import {beforeEach,describe,expect,it,vi} from 'vitest';
const m=vi.hoisted(()=>({sql:vi.fn(),send:vi.fn(),limit:vi.fn(),record:vi.fn()}));
vi.mock('@/lib/google-business/live-reviews',()=>({liveDb:()=>m.sql}));
vi.mock('@/lib/hosted-setup-email',()=>({sendCustomerActivationEmail:m.send}));
vi.mock('@/lib/auth-rate-limit',()=>({checkLoginRateLimit:m.limit,recordLoginAttempt:m.record}));
vi.mock('@/lib/marketing-subscriptions',()=>({marketingCheckoutEnabled:()=>true}));
import {POST} from '@/app/api/account/register/route';
const request=(origin='https://taprater.com')=>new Request('https://taprater.com/api/account/register',{method:'POST',headers:{origin},body:JSON.stringify({email:'QA@example.test',name:'QA customer'})});
describe('customer registration',()=>{
 beforeEach(()=>{vi.clearAllMocks();m.sql.mockResolvedValue([{id:'qa'}]);m.send.mockResolvedValue({sent:true});m.limit.mockResolvedValue({context:{configured:true},limited:false});});
 it('sends activation without granting package access',async()=>{const r=await POST(request());expect(r.status).toBe(200);expect(m.sql).toHaveBeenCalledTimes(1);expect(m.send).toHaveBeenCalledWith(expect.objectContaining({to:'qa@example.test',customerId:'qa'}));});
 it('does not claim delivery when the email provider fails',async()=>{m.send.mockResolvedValue({sent:false,reason:'provider_error'});const r=await POST(request());expect(r.status).toBe(503);expect(await r.json()).not.toHaveProperty('sent');});
 it('does not resend or reset an existing active account',async()=>{m.sql.mockResolvedValue([]);expect((await POST(request())).status).toBe(200);expect(m.send).not.toHaveBeenCalled();});
 it('rejects cross-origin registration before writing',async()=>{expect((await POST(request('https://example.test'))).status).toBe(403);expect(m.sql).not.toHaveBeenCalled();});
 it('enforces rate limits before sending',async()=>{m.limit.mockResolvedValue({context:{configured:true},limited:true});expect((await POST(request())).status).toBe(429);expect(m.send).not.toHaveBeenCalled();});
});
