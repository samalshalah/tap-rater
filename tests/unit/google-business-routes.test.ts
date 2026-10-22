import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ cookie:vi.fn(), customer:vi.fn(), clearCookie:vi.fn(), identity: vi.fn(), sameOrigin: vi.fn(), begin: vi.fn(), complete: vi.fn(), disconnect: vi.fn() }));
vi.mock("next/headers",()=>({cookies:async()=>({get:mocks.cookie,delete:mocks.clearCookie})}));
vi.mock("@/lib/google-business/customer-connection",()=>({customerFlowCookie:"flow",googleCustomerIdentity:mocks.customer}));
vi.mock("@/lib/google-business/http", () => ({ googleAdminIdentity: mocks.identity, googleSameOrigin: mocks.sameOrigin }));
vi.mock("@/lib/google-business/connection", () => ({ GoogleTokenExchangeError: class extends Error {}, beginGoogleConnection: mocks.begin, completeGoogleConnection: mocks.complete, disconnectGoogle: mocks.disconnect, googleConfig: () => ({ redirectUri: "https://taprater.com/api/admin/google-business/callback" }) }));
import { POST as connect } from "../../src/app/api/admin/google-business/connect/route";
import { GET as callback } from "../../src/app/api/admin/google-business/callback/route";
import { POST as disconnect } from "../../src/app/api/admin/google-business/disconnect/route";
beforeEach(() => { vi.clearAllMocks();mocks.cookie.mockReturnValue(undefined);mocks.customer.mockResolvedValue(null);mocks.complete.mockResolvedValue(undefined); mocks.identity.mockResolvedValue({ owner: "owner", session: "signed-session" }); mocks.sameOrigin.mockReturnValue(true); });
describe("Google OAuth routes", () => {
  it("requires an authenticated admin on every route", async () => {
    mocks.identity.mockResolvedValue(null);
    for (const handler of [connect, disconnect]) {
      expect((await handler(new Request("https://taprater.com/api/admin/google-business/callback"))).status).toBe(401);
    }
    expect(mocks.begin).not.toHaveBeenCalled(); expect(mocks.complete).not.toHaveBeenCalled(); expect(mocks.disconnect).not.toHaveBeenCalled();
  });
  it("blocks cross-origin connect and disconnect", async () => {
    mocks.sameOrigin.mockReturnValue(false);
    expect((await connect(new Request("https://taprater.com"))).status).toBe(403);
    expect((await disconnect(new Request("https://taprater.com"))).status).toBe(403);
    expect(mocks.begin).not.toHaveBeenCalled(); expect(mocks.disconnect).not.toHaveBeenCalled();
  });
  it("binds connection initiation to the authenticated session", async () => {
    mocks.begin.mockResolvedValue("https://accounts.google.com/o/oauth2/v2/auth?state=state");
    const response = await connect(new Request("https://taprater.com"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth?state=state" });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mocks.begin).toHaveBeenCalledWith("owner", "signed-session");
  });
  it("does not reflect token errors or attacker-controlled redirect hosts", async () => {
    mocks.complete.mockRejectedValue(new Error("private-code-or-token"));
    const response = await callback(new Request("https://attacker.example/callback?code=secret&state=state"));
    expect(response.headers.get("location")).toBe("https://taprater.com/admin/google-reviews?connection=failed&step=validate");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(await response.text()).not.toContain("private-code-or-token");
  });
  it("handles denial without exchanging an authorization code", async () => {
    const response = await callback(new Request("https://taprater.com/api/admin/google-business/callback?error=access_denied"));
    expect(response.headers.get("location")).toContain("connection=cancelled");
    expect(mocks.complete).not.toHaveBeenCalled();
  });
});

describe('client OAuth callback routing',()=>{
 it('uses the client session and returns only to the client workspace',async()=>{
  mocks.cookie.mockReturnValue({value:'state'});mocks.customer.mockResolvedValue({owner:'customer:client@example.com',session:'client-session'});
  const response=await callback(new Request('https://taprater.com/api/admin/google-business/callback?state=state&code=code'));
  expect(mocks.complete).toHaveBeenCalledWith('customer:client@example.com','client-session','state','code',expect.any(Function));
  expect(mocks.identity).not.toHaveBeenCalled();expect(response.headers.get('location')).toBe('https://taprater.com/account/reviews?connection=connected');
 });
 it('does not exchange mismatched customer state',async()=>{
  mocks.cookie.mockReturnValue({value:'state'});mocks.customer.mockResolvedValue({owner:'customer:client@example.com',session:'client-session'});
  const response=await callback(new Request('https://taprater.com/api/admin/google-business/callback?state=wrong&code=code'));
  expect(mocks.complete).not.toHaveBeenCalled();expect(response.headers.get('location')).toContain('/account/reviews?connection=failed');
 });
 it('never falls back to admin when the client session is absent',async()=>{mocks.cookie.mockReturnValue({value:'state'});expect((await callback(new Request('https://taprater.com/callback'))).headers.get('location')).toBe('https://taprater.com/google-connection-recovery');expect(mocks.identity).not.toHaveBeenCalled();});
});

describe('missing OAuth browser session recovery',()=>{
 it('redirects to a trusted restart page without reflecting code, state, or host',async()=>{
  mocks.identity.mockResolvedValue(null);
  const response=await callback(new Request('https://attacker.example/callback?state=private-state&code=private-code'));
  expect(response.status).toBe(303);
  expect(response.headers.get('location')).toBe('https://taprater.com/google-connection-recovery');
  expect(response.headers.get('cache-control')).toBe('no-store');
  expect(response.headers.get('referrer-policy')).toBe('no-referrer');
  expect(mocks.complete).not.toHaveBeenCalled();
 });
});
