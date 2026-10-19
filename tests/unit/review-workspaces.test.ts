import { describe, it, expect, vi, afterEach } from "vitest";
const { sql, customerAuth, adminAuth } = vi.hoisted(() => ({
 sql: vi.fn(), customerAuth: vi.fn(), adminAuth: vi.fn()
}));
vi.mock("@neondatabase/serverless", () => ({ neon: () => sql }));
vi.mock("@/lib/customer-auth", () => ({ requireCustomerApi: customerAuth }));
vi.mock("@/lib/google-business/http", () => ({ googleAdminIdentity: adminAuth }));
import { listReviewWorkspaces, saveSampleReply, reviewDraftSchema } from "@/lib/review-workspaces";
import { handleSampleReply } from "@/lib/review-workspace-http";
const id = "9fb3ee3b-0920-4db5-a03d-7245987a8751";
afterEach(() => { vi.clearAllMocks(); vi.unstubAllEnvs(); });
describe("sample review workspace authorization", () => {
 it("scopes customer reads to the active account and returns no other workspaces", async () => {
  sql.mockResolvedValueOnce([]);
  expect(await listReviewWorkspaces({kind:"customer",email:" OWNER@EXAMPLE.COM "},sql as any)).toEqual([]);
  const [query,...values] = sql.mock.calls[0];
  expect(query.join("?")).toContain("c.account_status = 'active'");
  expect(values).toEqual([false,"owner@example.com"]);
 });
 it("binds ownership and optimistic version to the same draft update", async () => {
  sql.mockResolvedValueOnce([]);
  expect(await saveSampleReply({kind:"customer",email:"other@example.com"},{id,reply:"Thank you",status:"draft",version:3},sql as any)).toBeNull();
  const [query,...values] = sql.mock.calls[0];
  expect(query.join("?")).toContain("r.version=");
  expect(query.join("?")).toContain("r.business_id=b.id");
  expect(query.join("?")).toContain("c.account_status='active'");
  expect(values).toEqual(["Thank you","draft",id,3,false,"other@example.com"]);
 });
 it("rejects publishing, invented tenant fields, empty ready replies and oversized drafts", () => {
  for (const data of [
   {id,reply:"Hi",status:"published",version:1},
   {id,reply:"Hi",status:"ready",version:1,businessId:id},
   {id,reply:" ",status:"ready",version:1},
   {id,reply:"x".repeat(4001),status:"draft",version:1}
  ]) expect(reviewDraftSchema.safeParse(data).success).toBe(false);
 });
 it("requires real admin authentication even in development", async () => {
  adminAuth.mockResolvedValue(null);
  const r=await handleSampleReply(new Request("https://taprater.com/api/admin/review-workspaces",{method:"POST"}),"admin");
  expect(r.status).toBe(401);expect(sql).not.toHaveBeenCalled();
 });
 it("rejects cross-origin customer writes", async () => {
  customerAuth.mockResolvedValue({response:null,session:{email:"owner@example.com"}});
  const r=await handleSampleReply(new Request("https://taprater.com/api/account/reviews",{method:"POST",headers:{origin:"https://evil.example"},body:"{}"}),"customer");
  expect(r.status).toBe(403);expect(sql).not.toHaveBeenCalled();
 });
 it("rejects a publish attempt without touching storage", async () => {
  customerAuth.mockResolvedValue({response:null,session:{email:"owner@example.com"}});
  const r=await handleSampleReply(new Request("https://taprater.com/api/account/reviews",{method:"POST",headers:{origin:"https://taprater.com"},body:JSON.stringify({id,reply:"Hi",status:"published",version:1})}),"customer");
  expect(r.status).toBe(400);expect(sql).not.toHaveBeenCalled();
 });
});
