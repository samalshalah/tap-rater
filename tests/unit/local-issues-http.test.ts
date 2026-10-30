vi.mock('@/lib/business-optimization-feature',()=>({businessOptimizationEnabled:true}));
import {describe,it,expect,vi,afterEach} from 'vitest';
const {auth,admin,snapshot,mutate}=vi.hoisted(()=>({auth:vi.fn(),admin:vi.fn(),snapshot:vi.fn(),mutate:vi.fn()}));
vi.mock('@/lib/customer-auth',()=>({requireCustomerApi:auth}));
vi.mock('@/lib/google-business/http',()=>({googleAdminIdentity:admin}));
vi.mock('@/lib/local-issues',async original=>({...await original<object>(),localIssueSnapshot:snapshot,mutateIssue:mutate}));
import {handleLocalIssues} from '@/lib/local-issue-http';
const id='9fb3ee3b-0920-4db5-a03d-7245987a8751';
const request=(body:unknown,origin='https://taprater.com')=>new Request('https://taprater.com/api/account/local/issues',{method:'POST',headers:{origin},body:JSON.stringify(body)});
afterEach(()=>vi.clearAllMocks());
describe('notification HTTP boundaries',()=>{
 it('requires a session for customers and admins',async()=>{auth.mockResolvedValue({response:Response.json({},{status:401})});admin.mockResolvedValue(null);expect((await handleLocalIssues(request({}),'customer')).status).toBe(401);expect((await handleLocalIssues(request({}),'admin')).status).toBe(401);expect(snapshot).not.toHaveBeenCalled();});
 it('rejects cross-origin changes, arbitrary account fields and unsupported scan actions',async()=>{auth.mockResolvedValue({session:{email:'one@example.com'}});expect((await handleLocalIssues(request({},'https://other.example'),'customer')).status).toBe(403);expect((await handleLocalIssues(request({action:'preview',businessId:id,id,fingerprint:'a'.repeat(64),price:0}),'customer')).status).toBe(400);expect((await handleLocalIssues(request({action:'scan',businessId:id}),'customer')).status).toBe(400);expect(mutate).not.toHaveBeenCalled();});
 it('derives identity from the session and permits only validated tracking setup',async()=>{auth.mockResolvedValue({session:{email:'one@example.com'}});mutate.mockResolvedValue({initialized:true});const body={action:'read',businessId:id,id,fingerprint:'a'.repeat(64)};expect((await handleLocalIssues(request(body),'customer')).status).toBe(200);expect(mutate).toHaveBeenCalledWith({kind:'customer',email:'one@example.com'},body);});
 it('never caches private tracking settings',async()=>{auth.mockResolvedValue({session:{email:'one@example.com'}});snapshot.mockResolvedValue({tracks:[]});const response=await handleLocalIssues(new Request('https://taprater.com/api/account/local/issues?businessId='+id),'customer');expect(response.headers.get('Cache-Control')).toBe('private, no-store');expect(snapshot).toHaveBeenCalledWith({kind:'customer',email:'one@example.com'},id);});
});
