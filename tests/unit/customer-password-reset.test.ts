import { afterEach, describe, expect, it, vi } from "vitest";
import { verifyCustomerPassword } from "@/lib/customer-account";
import { createCustomerPasswordResetUrl, hashPasswordResetToken, requestCustomerPasswordResetWithClient, resetCustomerPasswordWithClient } from "@/lib/customer-password-reset";

const now = new Date("2026-09-05T12:00:00Z");
const token = "a".repeat(43);
const validCustomer = {
  id: "customer-1", email: "owner@example.com", account_status: "active", password_hash: "original",
  password_reset_token_hash: hashPasswordResetToken(token), password_reset_expires_at: "2026-09-05T12:20:00Z"
};

afterEach(() => vi.unstubAllEnvs());

describe("customer password recovery", () => {
  it("uses the configured account origin, not a request host", () => {
    vi.stubEnv("NEXT_PUBLIC_ACCOUNT_APP_URL", "https://app.taprater.com");
    expect(createCustomerPasswordResetUrl(token)).toBe(`https://app.taprater.com/account/reset-password?token=${token}`);
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_ACCOUNT_APP_URL", "http://app.taprater.com");
    expect(() => createCustomerPasswordResetUrl(token)).toThrow("HTTPS");
  });

  it("stores only a random token hash and sends a 20-minute link", async () => {
    const db = createDb();
    const send = vi.fn().mockResolvedValue({ sent: true });
    await requestCustomerPasswordResetWithClient(db.client, " OWNER@example.com ", now, send);
    const sentToken = new URL(send.mock.calls[0][0].resetUrl).searchParams.get("token")!;
    expect(sentToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(db.row.password_reset_token_hash).toBe(hashPasswordResetToken(sentToken));
    expect(db.row.password_reset_token_hash).not.toBe(sentToken);
    expect(db.row.password_reset_expires_at).toBe("2026-09-05T12:20:00.000Z");
    expect(db.row.password_hash).toBe("original");
    expect(db.row.sessions_invalid_before).toBeUndefined();
  });

  it.each(["disabled", "pending_activation", "missing"])("does not send recovery for %s customers", async (status) => {
    const db = createDb({ account_status: status });
    const send = vi.fn();
    await requestCustomerPasswordResetWithClient(db.client, "owner@example.com", now, send);
    expect(send).not.toHaveBeenCalled();
    expect(db.row.password_hash).toBe("original");
  });

  it("does not expose or reset the environment-managed admin account", async () => {
    vi.stubEnv("ADMIN_EMAIL", "OWNER@example.com");
    const db = createDb();
    const send = vi.fn();
    await requestCustomerPasswordResetWithClient(db.client, "owner@example.com", now, send);
    expect(send).not.toHaveBeenCalled();
    expect(await resetCustomerPasswordWithClient(db.client, token, "new-password", now)).toMatchObject({ ok: false });
  });

  it("replaces old reset links and clears undelivered links", async () => {
    const db = createDb();
    await requestCustomerPasswordResetWithClient(db.client, "owner@example.com", now, vi.fn().mockResolvedValue({ sent: true }));
    expect(await resetCustomerPasswordWithClient(db.client, token, "new-password", now)).toMatchObject({ ok: false });
    await requestCustomerPasswordResetWithClient(db.client, "owner@example.com", now, vi.fn().mockResolvedValue({ sent: false }));
    expect(db.row.password_reset_token_hash).toBeNull();
  });

  it("does not clear a newer link when an older email fails", async () => {
    const db = createDb();
    await requestCustomerPasswordResetWithClient(db.client, "owner@example.com", now, vi.fn().mockImplementation(async () => {
      db.row.password_reset_token_hash = "newer-token-hash";
      return { sent: false };
    }));
    expect(db.row.password_reset_token_hash).toBe("newer-token-hash");
  });

  it("changes the password, consumes the token, and revokes sessions atomically", async () => {
    const db = createDb();
    expect(await resetCustomerPasswordWithClient(db.client, token, "replacement-password", now)).toEqual({ ok: true, email: "owner@example.com" });
    expect(verifyCustomerPassword("replacement-password", String(db.row.password_hash))).toBe(true);
    expect(db.row).toMatchObject({ password_reset_token_hash: null, password_reset_expires_at: null, sessions_invalid_before: now.toISOString() });
    expect(await resetCustomerPasswordWithClient(db.client, token, "another-password", now)).toMatchObject({ ok: false, status: 401 });
  });

  it("allows only one concurrent token redemption", async () => {
    const db = createDb();
    const results = await Promise.all([
      resetCustomerPasswordWithClient(db.client, token, "password-one", now),
      resetCustomerPasswordWithClient(db.client, token, "password-two", now)
    ]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
  });

  it.each(["2026-09-05T11:59:00Z", now.toISOString(), "invalid", null])("rejects expired/missing expiry %s", async (expiry) => {
    const db = createDb({ password_reset_expires_at: expiry });
    expect(await resetCustomerPasswordWithClient(db.client, token, "new-password", now)).toMatchObject({ ok: false, status: 401 });
    expect(db.row.password_hash).toBe("original");
  });

  it.each(["disabled", "pending_activation"])("does not reset %s accounts", async (status) => {
    const db = createDb({ account_status: status });
    expect(await resetCustomerPasswordWithClient(db.client, token, "new-password", now)).toMatchObject({ ok: false });
  });

  it("rejects invalid tokens and password lengths without writing", async () => {
    const db = createDb();
    for (const badToken of ["short", "b".repeat(43), "a".repeat(1000)]) {
      expect(await resetCustomerPasswordWithClient(db.client, badToken, "new-password", now)).toMatchObject({ ok: false });
    }
    for (const password of ["short", "x".repeat(201)]) {
      expect(await resetCustomerPasswordWithClient(db.client, token, password, now)).toMatchObject({ ok: false, status: 400 });
    }
    expect(db.row.password_hash).toBe("original");
  });

  it("fails closed when persistence fails", async () => {
    const db = createDb({}, true);
    await expect(resetCustomerPasswordWithClient(db.client, token, "new-password", now)).rejects.toThrow("unavailable");
    await expect(requestCustomerPasswordResetWithClient(db.client, "owner@example.com", now, vi.fn())).rejects.toThrow("unavailable");
  });
});

function createDb(overrides: Record<string, unknown> = {}, fail = false) {
  const row: Record<string, unknown> = { ...validCustomer, ...overrides };
  const client = {
    from(table: string) {
      expect(table).toBe("customers");
      const filters: Array<(value: Record<string, unknown>) => boolean> = [];
      let values: Record<string, unknown> | undefined;
      const execute = () => {
        if (fail) return { data: null, error: { message: "offline" } };
        if (!filters.every((filter) => filter(row))) return { data: null, error: null };
        if (values) Object.assign(row, values);
        return { data: { ...row }, error: null };
      };
      const builder = {
        select: () => builder,
        eq: (key: string, value: unknown) => { filters.push((item) => item[key] === value); return builder; },
        gte: (key: string, value: string) => { filters.push((item) => Date.parse(String(item[key])) >= Date.parse(value)); return builder; },
        update: (input: Record<string, unknown>) => { values = input; return builder; },
        maybeSingle: async () => execute(),
        then: (resolve: (result: unknown) => void) => resolve(execute())
      };
      return builder;
    }
  };
  return { client, row };
}
