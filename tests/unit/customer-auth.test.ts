import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createCustomerLoginToken,
  createCustomerSessionValue,
  isActiveCustomerSessionWithClient,
  parseCustomerLoginToken,
  parseCustomerSession
} from "@/lib/customer-auth";

describe("customer auth", () => {
  beforeEach(() => {
    process.env.CUSTOMER_SESSION_SECRET = "customer-secret-for-tests";
    vi.setSystemTime(new Date("2026-07-09T12:00:00.000Z"));
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.CUSTOMER_SESSION_SECRET;
  });

  it("creates and validates signed customer sessions", () => {
    const session = createCustomerSessionValue("OWNER@EXAMPLE.COM");

    expect(parseCustomerSession(session)).toEqual({ email: "owner@example.com" });
  });

  it("validates URL-encoded signed customer sessions from response cookies", () => {
    const session = createCustomerSessionValue("owner@example.com");

    expect(parseCustomerSession(encodeURIComponent(session))).toEqual({ email: "owner@example.com" });
  });

  it("rejects expired customer sessions", () => {
    const session = createCustomerSessionValue("owner@example.com", Date.now() - 31 * 24 * 60 * 60 * 1000);

    expect(parseCustomerSession(session)).toBeNull();
  });

  it("rejects tampered customer sessions", () => {
    const session = createCustomerSessionValue("owner@example.com").replace("owner", "other");

    expect(parseCustomerSession(session)).toBeNull();
  });

  it("creates short-lived login tokens", () => {
    const token = createCustomerLoginToken("owner@example.com");

    expect(parseCustomerLoginToken(token)).toEqual({ email: "owner@example.com" });
    vi.setSystemTime(new Date("2026-07-09T12:20:01.000Z"));
    expect(parseCustomerLoginToken(token)).toBeNull();
  });

  it("accepts persisted sessions only while the customer account remains active", async () => {
    const createClient = (accountStatus: string | null) => ({
      from: () => {
        const builder = {
          select: () => builder,
          eq: () => builder,
          maybeSingle: async () => ({
            data: accountStatus ? { account_status: accountStatus } : null,
            error: null
          })
        };
        return builder;
      }
    });

    await expect(isActiveCustomerSessionWithClient(createClient("active"), "OWNER@example.com")).resolves.toBe(true);
    await expect(isActiveCustomerSessionWithClient(createClient("pending_activation"), "owner@example.com")).resolves.toBe(false);
    await expect(isActiveCustomerSessionWithClient(createClient("disabled"), "owner@example.com")).resolves.toBe(false);
    await expect(isActiveCustomerSessionWithClient(createClient(null), "owner@example.com")).resolves.toBe(false);
  });
});
