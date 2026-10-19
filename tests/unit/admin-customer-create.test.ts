import { describe,it,expect,vi,afterEach } from "vitest";
const {auth}=vi.hoisted(()=>({auth:vi.fn()}));
vi.mock("@/lib/google-business/http",()=>({googleAdminIdentity:auth}));
vi.mock("@/lib/db",()=>({getSupabaseAdmin:vi.fn()}));
import {createAdminCustomer,createCustomerSchema} from "@/lib/admin-customer-create";
import {POST} from "@/app/api/admin/customers/route";
afterEach(()=>vi.clearAllMocks());
function client(existing:unknown=null,insertError:unknown=null) {
 const insert=vi.fn();
 const c={from:vi.fn(()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:existing,error:null})})}),insert}))};
 insert.mockReturnValue({select:()=>({single:async()=>({data:insertError?null:{id:"new",email:"owner@example.com"},error:insertError})})});
 return {c,insert};
}
describe("admin customer creation",()=>{
 it("creates a pending customer without password, admin privileges or an email side effect",async()=>{
  const {c,insert}=client();
  const result=await createAdminCustomer({name:" Norah Boutique ",email:" OWNER@EXAMPLE.COM "},c);
  expect(result.ok).toBe(true);
  expect(insert).toHaveBeenCalledWith({name:"Norah Boutique",email:"owner@example.com",phone:null,role:"customer",account_status:"pending_activation"});
 });
 it("preserves existing accounts instead of overwriting them",async()=>{
  const {c,insert}=client({id:"existing"});
  expect(await createAdminCustomer({name:"New name",email:"owner@example.com"},c)).toMatchObject({ok:false,status:409});
  expect(insert).not.toHaveBeenCalled();
 });
 it("handles a concurrent duplicate insert",async()=>{
  const {c}=client(null,{code:"23505"});
  expect(await createAdminCustomer({name:"Norah",email:"owner@example.com"},c)).toMatchObject({ok:false,status:409});
 });
 it("rejects privilege escalation and malformed email",()=>{
  expect(createCustomerSchema.safeParse({name:"Norah",email:"invalid"}).success).toBe(false);
  expect(createCustomerSchema.safeParse({name:"Norah",email:"owner@example.com",account_status:"active",role:"admin"}).success).toBe(false);
 });
 it("rejects unsigned admin requests",async()=>{
  auth.mockResolvedValue(null);
  expect((await POST(new Request("https://taprater.com/api/admin/customers",{method:"POST"}))).status).toBe(401);
 });
 it("rejects cross-origin requests before creating anything",async()=>{
  auth.mockResolvedValue({owner:"admin@example.com"});
  expect((await POST(new Request("https://taprater.com/api/admin/customers",{method:"POST",headers:{origin:"https://evil.example"}}))).status).toBe(403);
 });
});
