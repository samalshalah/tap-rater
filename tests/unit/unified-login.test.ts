import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ cookie: undefined as string | undefined, customer: vi.fn(), verify: vi.fn(), rate: vi.fn(), record: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: (name: string) => name === "taprater_admin" && mocks.cookie ? { value: mocks.cookie } : undefined }) }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); } }));
vi.mock("@/lib/customer-account", () => ({ getCustomerPasswordLoginRecord: mocks.customer, verifyCustomerPassword: mocks.verify }));
vi.mock("@/lib/auth-rate-limit", () => ({ checkLoginRateLimit: mocks.rate, recordLoginAttempt: mocks.record }));
import AdminLoginPage from "@/app/admin/login/page";
import { createAdminSessionValue, requireAdmin, requireAdminApi } from "@/lib/admin-auth";
import { POST } from "@/app/api/account/login/request/route";
beforeEach(() => {
  vi.clearAllMocks(); mocks.cookie = undefined;
  vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("ADMIN_EMAIL", "admin@example.com");
  vi.stubEnv("ADMIN_PASSWORD", "admin-test-password"); vi.stubEnv("ADMIN_SESSION_SECRET", "admin-test-secret");
  vi.stubEnv("CUSTOMER_SESSION_SECRET", "customer-test-secret");
  mocks.rate.mockResolvedValue({ limited: false, context: {} });
  mocks.customer.mockResolvedValue({ configured: true, customer: { email: "customer@example.com", passwordHash: "hash", accountStatus: "active" } });
  mocks.verify.mockReturnValue(true);
});
afterEach(() => vi.unstubAllEnvs());
const login = (email: string, password: string) => POST(new Request("https://taprater.com/api/account/login/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) }));
it("redirects the legacy login page to the shared form in production and development", () => {
  expect(() => AdminLoginPage()).toThrow("redirect:/account/login");
  vi.stubEnv("NODE_ENV", "development");
  expect(() => AdminLoginPage()).toThrow("redirect:/account/login");
});
it("sends unauthenticated admin pages to the shared login while APIs remain protected", async () => {
  await expect(requireAdmin()).rejects.toThrow("redirect:/account/login");
  expect((await requireAdminApi())?.status).toBe(401);
  mocks.cookie = createAdminSessionValue("admin@example.com");
  await expect(requireAdmin()).resolves.toBeUndefined();
  expect(await requireAdminApi()).toBeNull();
});
it("uses the shared endpoint for admin credentials with only an admin cookie", async () => {
  const response = await login("admin@example.com", "admin-test-password");
  expect(await response.json()).toEqual({ ok: true, redirectTo: "/admin" });
  expect(response.headers.get("set-cookie")).toContain("taprater_admin=");
  expect(response.headers.get("set-cookie")).not.toContain("taprater_customer=");
  expect(mocks.customer).not.toHaveBeenCalled();
  expect(mocks.rate.mock.calls[0][0].scope).toBe("admin");
});
it("keeps customer credentials on the account path without granting admin access", async () => {
  const response = await login("customer@example.com", "customer-password");
  expect(await response.json()).toEqual({ ok: true, redirectTo: "/account" });
  expect(response.headers.get("set-cookie")).not.toContain("taprater_admin=");
  expect(response.headers.get("set-cookie")).toBeTruthy();
  expect(mocks.rate.mock.calls[0][0].scope).toBe("customer");
});
it("rejects incorrect admin credentials without falling back to customer authentication", async () => {
  const response = await login("admin@example.com", "wrong-password");
  expect(response.status).toBe(401);
  expect(response.headers.get("set-cookie")).toBeNull();
  expect(mocks.customer).not.toHaveBeenCalled();
});
it("retains rate limiting before either authentication path", async () => {
  mocks.rate.mockResolvedValue({ limited: true, retryAfterSeconds: 900 });
  const response = await login("admin@example.com", "admin-test-password");
  expect(response.status).toBe(429);
  expect(response.headers.get("set-cookie")).toBeNull();
});
