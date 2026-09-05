import { describe, expect, it, vi } from "vitest";
import { buildAdminCustomerSummaries, updateAdminCustomerAccessWithClient } from "@/lib/admin-customers";

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
        maybeSingle: vi.fn(async () => ({ data: matchingRows()[0] ?? null, error: null })),
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
