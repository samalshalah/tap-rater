import { createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAdminSessionValue, isValidAdminSession } from "@/lib/admin-auth";
import { createCustomerLoginToken, createCustomerSessionValue, parseCustomerLoginToken, parseCustomerSession } from "@/lib/customer-auth";
import { createSessionToken, parseSessionToken } from "@/lib/session-token";
import { getLaunchReadinessChecks } from "@/lib/launch-readiness";

describe("session purpose isolation", () => {
  beforeEach(() => {
    vi.stubEnv("ADMIN_EMAIL", "owner@example.com");
    vi.stubEnv("ADMIN_SESSION_SECRET", "admin-only-test-secret");
    vi.stubEnv("CUSTOMER_SESSION_SECRET", "customer-only-test-secret");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("does not exchange admin sessions, customer sessions, and login links", () => {
    const admin = createAdminSessionValue("owner@example.com");
    const customer = createCustomerSessionValue("owner@example.com");
    const login = createCustomerLoginToken("owner@example.com");
    expect(isValidAdminSession(admin)).toBe(true);
    expect(parseCustomerSession(customer)).not.toBeNull();
    expect(parseCustomerLoginToken(login)).not.toBeNull();
    expect(isValidAdminSession(customer)).toBe(false);
    expect(isValidAdminSession(login)).toBe(false);
    expect(parseCustomerSession(admin)).toBeNull();
    expect(parseCustomerSession(login)).toBeNull();
    expect(parseCustomerLoginToken(admin)).toBeNull();
    expect(parseCustomerLoginToken(customer)).toBeNull();
  });

  it.each(["", "admin-only-test-secret"])("fails closed with a missing or shared customer secret: %s", (secret) => {
    const existing = createCustomerSessionValue("owner@example.com");
    vi.stubEnv("CUSTOMER_SESSION_SECRET", secret);
    expect(() => createCustomerSessionValue("owner@example.com")).toThrow(/separately/);
    expect(() => createCustomerLoginToken("owner@example.com")).toThrow(/separately/);
    expect(parseCustomerSession(existing)).toBeNull();
    expect(getLaunchReadinessChecks().find((check) => check.id === "customer-auth")?.status).toBe("blocked");
  });

  it("enforces purposes even if a token is signed with the other secret", () => {
    const signedAsCustomer = createSessionToken("customer-session", "owner@example.com", Date.now(), process.env.ADMIN_SESSION_SECRET!);
    expect(isValidAdminSession(signedAsCustomer)).toBe(false);
    const signedAsAdmin = createSessionToken("admin-session", "owner@example.com", Date.now(), process.env.CUSTOMER_SESSION_SECRET!);
    expect(parseCustomerSession(signedAsAdmin)).toBeNull();
  });

  it("requires the configured admin identity at issuance and validation", () => {
    expect(() => createAdminSessionValue("other@example.com")).toThrow(/identity/);
    const other = createSessionToken("admin-session", "other@example.com", Date.now(), process.env.ADMIN_SESSION_SECRET!);
    expect(isValidAdminSession(other)).toBe(false);
    const admin = createAdminSessionValue("owner@example.com");
    vi.stubEnv("ADMIN_EMAIL", "");
    expect(isValidAdminSession(admin)).toBe(false);
  });

  it("invalidates legacy purpose-less sessions rather than retaining a bypass", () => {
    const payload = `owner@example.com:${Date.now()}`;
    for (const secret of [process.env.ADMIN_SESSION_SECRET!, process.env.CUSTOMER_SESSION_SECRET!]) {
      const legacy = `${payload}.${createHmac("sha256", secret).update(payload).digest("hex")}`;
      expect(isValidAdminSession(legacy)).toBe(false);
      expect(parseCustomerSession(legacy)).toBeNull();
      expect(parseCustomerLoginToken(legacy)).toBeNull();
    }
  });

  it.each([undefined, "", "%zz", "%2525", "x".repeat(2049), `v2:customer-session:owner@example.com:${Date.now()}.${"\u00e9".repeat(64)}`])("rejects malformed tokens without throwing", (value) => {
    expect(parseCustomerSession(value)).toBeNull();
    expect(isValidAdminSession(value)).toBe(false);
  });

  it("rejects future, expired, and tampered-purpose tokens", () => {
    const now = Date.now();
    expect(parseCustomerSession(createCustomerSessionValue("owner@example.com", now + 301000), now)).toBeNull();
    const login = createCustomerLoginToken("owner@example.com", now - 1200001);
    expect(parseCustomerLoginToken(login, now)).toBeNull();
    expect(parseCustomerSession(login.replace("customer-login", "customer-session"), now)).toBeNull();
    expect(parseSessionToken("anything", "admin-session", undefined, 1000)).toBeNull();
  });
});
