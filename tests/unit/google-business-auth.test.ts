import { afterEach, describe, expect, it, vi } from "vitest";
const { cookie } = vi.hoisted(() => ({ cookie: vi.fn() }));
vi.mock("next/headers", () => ({ cookies: async () => ({ get: cookie }) }));
import { googleAdminIdentity } from "../../src/lib/google-business/http";
import { createAdminSessionValue } from "../../src/lib/admin-auth";
afterEach(() => { vi.unstubAllEnvs(); cookie.mockReset(); });
describe("strict Google admin authorization", () => {
  it("does not inherit the local development admin bypass", async () => {
    vi.stubEnv("NODE_ENV", "development");
    cookie.mockReturnValue(undefined);
    expect(await googleAdminIdentity()).toBeNull();
  });
  it("accepts only a signed session for the configured owner", async () => {
    vi.stubEnv("ADMIN_EMAIL", "admin@example.com");
    vi.stubEnv("ADMIN_SESSION_SECRET", "test-session-secret");
    const session = createAdminSessionValue("admin@example.com");
    cookie.mockReturnValue({ value: session });
    expect(await googleAdminIdentity()).toEqual({ owner: "admin@example.com", session });
    cookie.mockReturnValue({ value: session + "tampered" });
    expect(await googleAdminIdentity()).toBeNull();
  });
});
