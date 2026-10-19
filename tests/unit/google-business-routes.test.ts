import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ identity: vi.fn(), sameOrigin: vi.fn(), begin: vi.fn(), complete: vi.fn(), disconnect: vi.fn() }));
vi.mock("@/lib/google-business/http", () => ({ googleAdminIdentity: mocks.identity, googleSameOrigin: mocks.sameOrigin }));
vi.mock("@/lib/google-business/connection", () => ({ beginGoogleConnection: mocks.begin, completeGoogleConnection: mocks.complete, disconnectGoogle: mocks.disconnect, googleConfig: () => ({ redirectUri: "https://taprater.com/api/admin/google-business/callback" }) }));
import { POST as connect } from "../../src/app/api/admin/google-business/connect/route";
import { GET as callback } from "../../src/app/api/admin/google-business/callback/route";
import { POST as disconnect } from "../../src/app/api/admin/google-business/disconnect/route";
beforeEach(() => { vi.clearAllMocks(); mocks.identity.mockResolvedValue({ owner: "owner", session: "signed-session" }); mocks.sameOrigin.mockReturnValue(true); });
describe("Google OAuth routes", () => {
  it("requires an authenticated admin on every route", async () => {
    mocks.identity.mockResolvedValue(null);
    for (const handler of [connect, callback, disconnect]) {
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
    expect(response.status).toBe(303);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mocks.begin).toHaveBeenCalledWith("owner", "signed-session");
  });
  it("does not reflect token errors or attacker-controlled redirect hosts", async () => {
    mocks.complete.mockRejectedValue(new Error("private-code-or-token"));
    const response = await callback(new Request("https://attacker.example/callback?code=secret&state=state"));
    expect(response.headers.get("location")).toBe("https://taprater.com/admin/google-reviews?connection=failed");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(await response.text()).not.toContain("private-code-or-token");
  });
  it("handles denial without exchanging an authorization code", async () => {
    const response = await callback(new Request("https://taprater.com/api/admin/google-business/callback?error=access_denied"));
    expect(response.headers.get("location")).toContain("connection=cancelled");
    expect(mocks.complete).not.toHaveBeenCalled();
  });
});
