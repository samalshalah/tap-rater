import { describe, expect, it, vi } from "vitest";
import {
  buildAdminCustomerSummaries,
  resendAdminCustomerActivationWithClient,
  updateAdminCustomerAccessWithClient
} from "@/lib/admin-customers";
import { customerActivationTtlMs } from "@/lib/customer-account";

describe("admin customer summaries", () => {
  it("combines accounts, guest orders, businesses, and active subscriptions", () => {
    const result = buildAdminCustomerSummaries({
      customers: [
        {
          id: "customer-1",
          email: "OWNER@EXAMPLE.COM",
          name: "Owner Example",
          phone: "555-0100",
          password_hash: "scrypt$salt$hash",
          account_status: "active",
          created_at: "2026-09-03T10:00:00.000Z"
        }
      ],
      businesses: [
        { customer_id: "customer-1", business_name: "Example Shop" },
        { customer_id: "customer-1", business_name: "Example Shop" }
      ],
      orders: [
        { email: "owner@example.com", status: "paid", total_cents: 5334 },
        { email: "owner@example.com", status: "failed", total_cents: 5334 },
        {
          email: "guest@example.com",
          status: "paid",
          total_cents: 3900,
          created_at: "2026-09-04T10:00:00.000Z"
        }
      ],
      subscriptions: [
        { customer_id: "customer-1", status: "active", lifecycle_status: "ACTIVE" },
        { customer_id: "customer-1", status: "canceled", lifecycle_status: "EXPIRED" }
      ]
    });

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: "guest:guest@example.com",
      email: "guest@example.com",
      orderCount: 1,
      paidTotalCents: 3900
    });
    expect(result[1]).toMatchObject({
      id: "customer-1",
      email: "owner@example.com",
      businessNames: ["Example Shop"],
      orderCount: 2,
      paidTotalCents: 5334,
      subscriptionCount: 2,
      activeSubscriptionCount: 1,
      canReactivate: true
    });
  });

  it("disables an account and invalidates any remaining activation token", async () => {
    const db = createCustomerAccessDb([
      {
        id: "customer-1",
        account_status: "active",
        password_hash: "scrypt$salt$hash",
        activation_token_hash: "stale-token",
        activation_expires_at: "2026-09-08T00:00:00.000Z"
      }
    ]);

    await expect(updateAdminCustomerAccessWithClient(db.client, "customer-1", "disabled")).resolves.toMatchObject({
      ok: true,
      status: "disabled"
    });
    expect(db.rows[0]).toMatchObject({
      account_status: "disabled",
      activation_token_hash: null,
      activation_expires_at: null
    });
  });

  it("does not activate an account before the customer has created a password", async () => {
    const db = createCustomerAccessDb([{ id: "customer-1", account_status: "disabled", password_hash: null }]);

    await expect(updateAdminCustomerAccessWithClient(db.client, "customer-1", "active")).rejects.toThrow(
      "must activate the account"
    );
    expect(db.rows[0].account_status).toBe("disabled");
  });

  it("rotates a pending customer's activation token and emails only the raw token", async () => {
    const now = new Date("2026-09-04T12:00:00.000Z");
    const db = createCustomerAccessDb([
      {
        id: "customer-1",
        email: "OWNER@EXAMPLE.COM",
        account_status: "pending_activation",
        activation_token_hash: "old-hash",
        activation_expires_at: "2026-09-05T12:00:00.000Z"
      }
    ]);
    const sendCustomerActivationEmailFn = vi.fn().mockResolvedValue({ sent: true });

    const result = await resendAdminCustomerActivationWithClient(db.client, "customer-1", {
      now,
      createActivationTokenFn: () => ({ token: "raw-activation-token", tokenHash: "a".repeat(64) }),
      sendCustomerActivationEmailFn
    });

    expect(result).toEqual({ ok: true });
    expect(db.rows[0]).toMatchObject({
      activation_token_hash: "a".repeat(64),
      activation_expires_at: new Date(now.getTime() + customerActivationTtlMs).toISOString(),
      updated_at: now.toISOString()
    });
    expect(JSON.stringify(db.rows[0])).not.toContain("raw-activation-token");
    expect(sendCustomerActivationEmailFn).toHaveBeenCalledWith({
      to: "owner@example.com",
      activationToken: "raw-activation-token",
      customerId: "customer-1"
    });
  });

  it("rate limits repeated activation emails for five minutes", async () => {
    const now = new Date("2026-09-04T12:00:00.000Z");
    const db = createCustomerAccessDb([
      {
        id: "customer-1",
        email: "owner@example.com",
        account_status: "pending_activation",
        activation_token_hash: "recent-hash",
        activation_expires_at: new Date(now.getTime() + customerActivationTtlMs - 60_000).toISOString()
      }
    ]);
    const sendCustomerActivationEmailFn = vi.fn();

    const result = await resendAdminCustomerActivationWithClient(db.client, "customer-1", {
      now,
      sendCustomerActivationEmailFn
    });

    expect(result).toMatchObject({ ok: false, status: 429, retryAfterSeconds: 240 });
    expect(sendCustomerActivationEmailFn).not.toHaveBeenCalled();
  });

  it("rejects activation resends for non-pending accounts", async () => {
    const db = createCustomerAccessDb([
      { id: "customer-1", email: "owner@example.com", account_status: "active" }
    ]);
    const sendCustomerActivationEmailFn = vi.fn();

    const result = await resendAdminCustomerActivationWithClient(db.client, "customer-1", {
      sendCustomerActivationEmailFn
    });

    expect(result).toMatchObject({ ok: false, status: 409 });
    expect(sendCustomerActivationEmailFn).not.toHaveBeenCalled();
  });

  it("restores the previous activation state when email delivery fails", async () => {
    const now = new Date("2026-09-04T12:00:00.000Z");
    const db = createCustomerAccessDb([
      {
        id: "customer-1",
        email: "owner@example.com",
        account_status: "pending_activation",
        activation_token_hash: "old-hash",
        activation_expires_at: "2026-09-05T12:00:00.000Z"
      }
    ]);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    const result = await resendAdminCustomerActivationWithClient(db.client, "customer-1", {
      now,
      createActivationTokenFn: () => ({ token: "raw-activation-token", tokenHash: "b".repeat(64) }),
      sendCustomerActivationEmailFn: vi.fn().mockResolvedValue({ sent: false, reason: "provider_error" })
    });

    expect(result).toMatchObject({ ok: false, status: 502 });
    expect(db.rows[0]).toMatchObject({
      activation_token_hash: "old-hash",
      activation_expires_at: "2026-09-05T12:00:00.000Z"
    });
    expect(warn).toHaveBeenCalledWith(
      "[admin-customers] activation_email_not_sent",
      expect.objectContaining({ customerId: "customer-1", reason: "provider_error", activationStateRestored: true })
    );
    warn.mockRestore();
  });
});

function createCustomerAccessDb(seed: Array<Record<string, unknown>>) {
  const rows = seed.map((row) => ({ ...row }));
  const client = {
    from(table: string) {
      if (table !== "customers") throw new Error(`Unexpected table: ${table}`);
      const filters: Array<{ column: string; value: unknown }> = [];
      let update: Record<string, unknown> | null = null;
      const matchingRows = () => rows.filter((row) => filters.every((filter) => row[filter.column] === filter.value));
      const builder = {
        select: vi.fn(() => builder),
        update: vi.fn((value: Record<string, unknown>) => {
          update = value;
          return builder;
        }),
        eq: vi.fn((column: string, value: unknown) => {
          filters.push({ column, value });
          return builder;
        }),
        maybeSingle: vi.fn(async () => {
          if (update) matchingRows().forEach((row) => Object.assign(row, update));
          return { data: matchingRows()[0] ?? null, error: null };
        }),
        then(resolve: (result: { data: null; error: null }) => void) {
          if (update) matchingRows().forEach((row) => Object.assign(row, update));
          resolve({ data: null, error: null });
        }
      };
      return builder;
    }
  };

  return { client: client as any, rows };
}
