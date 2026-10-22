import {describe,it,expect,vi,afterEach} from 'vitest';
const {auth,admin,snapshot,mutate}=vi.hoisted(()=>({auth:vi.fn(),admin:vi.fn(),snapshot:vi.fn(),mutate:vi.fn()}));
vi.mock('@/lib/customer-auth',()=>({requireCustomerApi:auth}));
vi.mock('@/lib/google-business/http',()=>({googleAdminIdentity:admin}));
vi.mock('@/lib/local-management',async original=>({...await original<object>(),localSnapshot:snapshot,mutateLocal:mutate}));
import {handleLocal} from '@/lib/local-management-http';
const request=(body:unknown,origin='https://taprater.com')=>new Request('https://taprater.com/api/account/local',{method:'POST',headers:{origin},body:JSON.stringify(body)});
afterEach(()=>vi.clearAllMocks());
describe('local management HTTP access',()=>{
 it('requires customer and admin sessions',async()=>{auth.mockResolvedValue({response:Response.json({},{status:401})});admin.mockResolvedValue(null);expect((await handleLocal(request({}),'customer')).status).toBe(401);expect((await handleLocal(request({}),'admin')).status).toBe(401);expect(snapshot).not.toHaveBeenCalled();});
 it('rejects cross-origin and missing-origin writes',async()=>{auth.mockResolvedValue({session:{email:'one@example.com'}});expect((await handleLocal(request({},'https://other.example'),'customer')).status).toBe(403);expect((await handleLocal(request({},''),'customer')).status).toBe(403);expect(mutate).not.toHaveBeenCalled();});
 it('rejects publication and malformed requests',async()=>{auth.mockResolvedValue({session:{email:'one@example.com'}});expect((await handleLocal(request({action:'publish'}),'customer')).status).toBe(400);expect(mutate).not.toHaveBeenCalled();});
 it('derives account identity from the session',async()=>{auth.mockResolvedValue({session:{email:'one@example.com'}});mutate.mockResolvedValue({id:'new'});const body={action:'createLocation',name:'Branch 2',address:'',phone:'',website:''};expect((await handleLocal(request(body),'customer')).status).toBe(200);expect(mutate).toHaveBeenCalledWith({kind:'customer',email:'one@example.com'},body);});
 it('does not cache private location lists',async()=>{auth.mockResolvedValue({session:{email:'one@example.com'}});snapshot.mockResolvedValue({locations:[]});const response=await handleLocal(new Request('https://taprater.com/api/account/local'),'customer');expect(response.headers.get('Cache-Control')).toBe('no-store');expect(snapshot).toHaveBeenCalledWith({kind:'customer',email:'one@example.com'});});
});
