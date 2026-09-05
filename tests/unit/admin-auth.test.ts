import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAdminSessionValue, isValidAdminSession } from "@/lib/admin-auth";

describe("admin auth", () => {
  const originalSecret = process.env.ADMIN_SESSION_SECRET;
  const originalTtl = process.env.ADMIN_SESSION_TTL_HOURS;
  beforeEach(() => { vi.stubEnv("ADMIN_EMAIL", "admin@taprater.com"); });

  afterEach(() => {
    process.env.ADMIN_SESSION_SECRET = originalSecret;
    process.env.ADMIN_SESSION_TTL_HOURS = originalTtl;
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  function signedSession(payload: string) {
    payload = `v2:admin-session:${payload}`;
    const signature = createHmac("sha256", process.env.ADMIN_SESSION_SECRET ?? "").update(payload).digest("hex");
    return `${payload}.${signature}`;
  }

  it("validates a signed admin session value", () => {
    process.env.ADMIN_SESSION_SECRET = "test-secret";

    const value = createAdminSessionValue("admin@taprater.com");

    expect(isValidAdminSession(value)).toBe(true);
  });

  it("rejects a tampered admin session value", () => {
    process.env.ADMIN_SESSION_SECRET = "test-secret";

    const value = createAdminSessionValue("admin@taprater.com");

    expect(isValidAdminSession(value.replace("admin", "owner"))).toBe(false);
  });

  it("rejects an expired admin session value using the default seven day ttl", () => {
    process.env.ADMIN_SESSION_SECRET = "test-secret";
    vi.setSystemTime(new Date("2026-07-09T12:00:00.000Z"));
    const value = signedSession(`admin@taprater.com:${Date.now() - 8 * 24 * 60 * 60 * 1000}`);

    expect(isValidAdminSession(value)).toBe(false);
  });

  it("uses ADMIN_SESSION_TTL_HOURS when present", () => {
    process.env.ADMIN_SESSION_SECRET = "test-secret";
    process.env.ADMIN_SESSION_TTL_HOURS = "2";
    vi.setSystemTime(new Date("2026-07-09T12:00:00.000Z"));

    expect(isValidAdminSession(signedSession(`admin@taprater.com:${Date.now() - 90 * 60 * 1000}`))).toBe(true);
    expect(isValidAdminSession(signedSession(`admin@taprater.com:${Date.now() - 3 * 60 * 60 * 1000}`))).toBe(false);
  });

  it("rejects malformed timestamps and missing payloads", () => {
    process.env.ADMIN_SESSION_SECRET = "test-secret";

    expect(isValidAdminSession(signedSession("admin@taprater.com:not-a-time"))).toBe(false);
    expect(isValidAdminSession(signedSession(""))).toBe(false);
  });

  it("rejects sessions created too far in the future", () => {
    process.env.ADMIN_SESSION_SECRET = "test-secret";
    vi.setSystemTime(new Date("2026-07-09T12:00:00.000Z"));

    expect(isValidAdminSession(signedSession(`admin@taprater.com:${Date.now() + 10 * 60 * 1000}`))).toBe(false);
  });
});
