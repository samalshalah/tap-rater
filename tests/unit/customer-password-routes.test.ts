import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ consume: vi.fn(), request: vi.fn(), reset: vi.fn(), email: vi.fn(), hasEmail: vi.fn(), after: vi.fn() }));
vi.mock("next/server", async (original) => ({ ...await original<typeof import("next/server")>(), after: mocks.after }));
vi.mock("@/lib/auth-rate-limit", () => ({ consumeCustomerRecoveryAttempt: mocks.consume }));
vi.mock("@/lib/customer-password-reset", () => ({ requestCustomerPasswordReset: mocks.request, resetCustomerPassword: mocks.reset }));
vi.mock("@/lib/email", () => ({ hasResendApiKey: mocks.hasEmail, sendCustomerPasswordChangedEmail: mocks.email }));
import { POST as forgot } from "@/app/api/account/password/forgot/route";
import { POST as reset } from "@/app/api/account/password/reset/route";

const token = "a".repeat(43);
const resetBody = { token, password: "new-password", confirmPassword: "new-password" };
function request(body: unknown) {
  return new Request("https://taprater.com/api/account/password/reset", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.consume.mockResolvedValue({ available: true, limited: false, retryAfterSeconds: 900 });
  mocks.hasEmail.mockReturnValue(true);
  mocks.reset.mockResolvedValue({ ok: true, email: "owner@example.com" });
});
afterEach(() => vi.restoreAllMocks());

describe("password recovery routes", () => {
  it("returns a generic result before performing the account lookup", async () => {
    for (const email of ["owner@example.com", "unknown@example.com"]) {
      const response = await forgot(request({ email }));
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ ok: true });
      expect(response.headers.get("cache-control")).toBe("no-store");
    }
    expect(mocks.request).not.toHaveBeenCalled();
    await mocks.after.mock.calls[0][0]();
    expect(mocks.request).toHaveBeenCalledWith("owner@example.com");
  });

  it("validates email before scheduling any delivery", async () => {
    expect((await forgot(request({ email: "invalid" }))).status).toBe(400);
    expect(mocks.after).not.toHaveBeenCalled();
  });

  it("limits both request and redemption paths", async () => {
    mocks.consume.mockResolvedValue({ available: true, limited: true, retryAfterSeconds: 900 });
    for (const response of [await forgot(request({ email: "owner@example.com" })), await reset(request(resetBody))]) {
      expect(response.status).toBe(429);
      expect(response.headers.get("retry-after")).toBe("900");
    }
    expect(mocks.after).not.toHaveBeenCalled();
    expect(mocks.reset).not.toHaveBeenCalled();
  });

  it("fails closed if rate limiting is unavailable", async () => {
    mocks.consume.mockResolvedValue({ available: false, limited: false });
    expect((await forgot(request({ email: "owner@example.com" }))).status).toBe(503);
    expect((await reset(request(resetBody))).status).toBe(503);
    expect(mocks.after).not.toHaveBeenCalled();
    expect(mocks.reset).not.toHaveBeenCalled();
  });

  it("does not claim delivery when email is unconfigured", async () => {
    mocks.hasEmail.mockReturnValue(false);
    expect((await forgot(request({ email: "owner@example.com" }))).status).toBe(503);
    expect(mocks.after).not.toHaveBeenCalled();
  });

  it("requires matching passwords and a correctly shaped token", async () => {
    for (const body of [{ ...resetBody, confirmPassword: "different" }, { ...resetBody, token: "bad" }, { ...resetBody, password: "short", confirmPassword: "short" }]) {
      expect((await reset(request(body))).status).toBe(400);
    }
    expect(mocks.reset).not.toHaveBeenCalled();
  });

  it("clears the session without automatically logging in and queues a notification", async () => {
    const response = await reset(request(resetBody));
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
    expect(await response.json()).toEqual({ ok: true });
    await mocks.after.mock.calls[0][0]();
    expect(mocks.email).toHaveBeenCalledWith("owner@example.com");
  });

  it("reports expired links without a notification or session", async () => {
    mocks.reset.mockResolvedValue({ ok: false, status: 401, error: "Expired link" });
    const response = await reset(request(resetBody));
    expect(response.status).toBe(401);
    expect(response.headers.get("set-cookie")).toBeNull();
    expect(mocks.after).not.toHaveBeenCalled();
  });

  it("returns a safe error on database failures", async () => {
    mocks.reset.mockRejectedValue(new Error("database secret"));
    const response = await reset(request(resetBody));
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain("database secret");
  });
});
