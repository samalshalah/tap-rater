import {describe,it,expect,vi,afterEach} from 'vitest';
const {auth,admin,snapshot,mutate}=vi.hoisted(()=>({auth:vi.fn(),admin:vi.fn(),snapshot:vi.fn(),mutate:vi.fn()}));
vi.mock('@/lib/customer-auth',()=>({requireCustomerApi:auth}));
vi.mock('@/lib/google-business/http',()=>({googleAdminIdentity:admin}));
vi.mock('@/lib/heatmap-management',async original=>({...await original<object>(),heatmapSnapshot:snapshot,mutateHeatmap:mutate}));
import {handleHeatmap} from '@/lib/heatmap-http';
const id='9fb3ee3b-0920-4db5-a03d-7245987a8751';
const request=(body:unknown,origin='https://taprater.com')=>new Request('https://taprater.com/api/account/local/heatmap',{method:'POST',headers:{origin},body:JSON.stringify(body)});
afterEach(()=>vi.clearAllMocks());
describe('heat-map HTTP boundaries',()=>{
 it('requires a session for customers and admins',async()=>{auth.mockResolvedValue({response:Response.json({},{status:401})});admin.mockResolvedValue(null);expect((await handleHeatmap(request({}),'customer')).status).toBe(401);expect((await handleHeatmap(request({}),'admin')).status).toBe(401);expect(snapshot).not.toHaveBeenCalled();});
 it('rejects cross-origin changes, arbitrary account fields and unsupported scan actions',async()=>{auth.mockResolvedValue({session:{email:'one@example.com'}});expect((await handleHeatmap(request({},'https://other.example'),'customer')).status).toBe(403);expect((await handleHeatmap(request({action:'initialize',businessId:id,customerId:id}),'customer')).status).toBe(400);expect((await handleHeatmap(request({action:'scan',businessId:id}),'customer')).status).toBe(400);expect(mutate).not.toHaveBeenCalled();});
 it('derives identity from the session and permits only validated tracking setup',async()=>{auth.mockResolvedValue({session:{email:'one@example.com'}});mutate.mockResolvedValue({initialized:true});const body={action:'initialize',businessId:id};expect((await handleHeatmap(request(body),'customer')).status).toBe(200);expect(mutate).toHaveBeenCalledWith({kind:'customer',email:'one@example.com'},body);});
 it('never caches private tracking settings',async()=>{auth.mockResolvedValue({session:{email:'one@example.com'}});snapshot.mockResolvedValue({tracks:[]});const response=await handleHeatmap(new Request('https://taprater.com/api/account/local/heatmap?businessId='+id),'customer');expect(response.headers.get('Cache-Control')).toBe('private, no-store');expect(snapshot).toHaveBeenCalledWith({kind:'customer',email:'one@example.com'},id);});
});
