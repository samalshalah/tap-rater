import {describe,it,expect,vi,afterEach} from "vitest";
const {auth,admin,suggest,save,run}=vi.hoisted(()=>({auth:vi.fn(),admin:vi.fn(),suggest:vi.fn(),save:vi.fn(),run:vi.fn()}));
vi.mock("@/lib/customer-auth",()=>({requireCustomerApi:auth}));
vi.mock("@/lib/google-business/http",()=>({googleAdminIdentity:admin}));
vi.mock("@/lib/review-ai",async original=>({...await original<object>(),suggestReviewReply:suggest,saveAutoSettings:save,runSampleAutoReplies:run}));
import {handleReviewAi} from "@/lib/review-ai-http";
afterEach(()=>vi.clearAllMocks());
const request=(body:unknown,origin="https://taprater.com")=>new Request("https://taprater.com/api/account/reviews/ai",{method:"POST",headers:{origin},body:JSON.stringify(body)});
describe("review AI request authorization",()=>{
 it("rejects signed-out customers",async()=>{
  auth.mockResolvedValue({response:Response.json({}, {status:401}),session:null});
  expect((await handleReviewAi(request({}),"customer")).status).toBe(401);
  expect(suggest).not.toHaveBeenCalled();
 });
 it("rejects cross-origin requests",async()=>{
  auth.mockResolvedValue({response:null,session:{email:"owner@example.com"}});
  expect((await handleReviewAi(request({},"https://evil.example"),"customer")).status).toBe(403);
 });
 it("only accepts server-known review IDs, never client-supplied review text",async()=>{
  auth.mockResolvedValue({response:null,session:{email:"owner@example.com"}});
  expect((await handleReviewAi(request({action:"suggest",id:"9fb3ee3b-0920-4db5-a03d-7245987a8751",comment:"Injected"}),"customer")).status).toBe(400);
  expect(suggest).not.toHaveBeenCalled();
 });
 it("binds an AI suggestion to the authenticated customer",async()=>{
  auth.mockResolvedValue({response:null,session:{email:"owner@example.com"}});suggest.mockResolvedValue({});
  expect((await handleReviewAi(request({action:"suggest",id:"9fb3ee3b-0920-4db5-a03d-7245987a8751"}),"customer")).status).toBe(200);
  expect(suggest).toHaveBeenCalledWith({kind:"customer",email:"owner@example.com"},"9fb3ee3b-0920-4db5-a03d-7245987a8751");
 });
});
