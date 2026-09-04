import { describe, expect, it, vi } from "vitest";
import {
  activateCustomerAccountWithClient,
  createCustomerActivationToken,
  hashActivationToken,
  hashCustomerPassword,
  verifyCustomerPassword
} from "@/lib/customer-account";

describe("customer account activation", () => {
  it("hashes passwords without storing the original password", () => {
    const hash = hashCustomerPassword("secret-password");

    expect(hash).not.toContain("secret-password");
    expect(verifyCustomerPassword("secret-password", hash)).toBe(true);
    expect(verifyCustomerPassword("wrong-password", hash)).toBe(false);
  });

  it("activates a pending customer and clears the one-time token", async () => {
    const activation = createCustomerActivationToken();
    const db = createCustomerDb({
      customers: [
        {
          id: "customer-1",
          email: "Owner@Example.com",
          account_status: "pending_activation",
          activation_token_hash: activation.tokenHash,
          activation_expires_at: "2026-09-07T12:00:00.000Z"
        }
      ]
    });

    const result = await activateCustomerAccountWithClient(
      db.client,
      activation.token,
      "new-password",
      new Date("2026-08-31T12:00:00.000Z")
    );

    expect(result).toEqual({ ok: true, email: "owner@example.com" });
    expect(db.rows.customers[0]).toMatchObject({
      account_status: "active",
      activation_token_hash: null,
      activation_expires_at: null,
      email_verified_at: "2026-08-31T12:00:00.000Z",
      activated_at: "2026-08-31T12:00:00.000Z"
    });
    expect(verifyCustomerPassword("new-password", String(db.rows.customers[0].password_hash))).toBe(true);
  });

  it("rejects expired activation tokens", async () => {
    const db = createCustomerDb({
      customers: [
        {
          id: "customer-1",
          email: "owner@example.com",
          activation_token_hash: hashActivationToken("expired-token"),
          activation_expires_at: "2026-08-30T12:00:00.000Z"
        }
      ]
    });

    const result = await activateCustomerAccountWithClient(db.client, "expired-token", "new-password", new Date("2026-08-31T12:00:00.000Z"));

    expect(result).toMatchObject({ ok: false, status: 401 });
    expect(db.rows.customers[0].account_status).not.toBe("active");
  });
});

function createCustomerDb(seed: { customers: Array<Record<string, unknown>> }) {
  const rows = { customers: [...seed.customers] };
  const client = {
    from(table: string) {
      if (table !== "customers") throw new Error(`Unexpected table: ${table}`);
      let filters: Array<{ column: string; value: unknown }> = [];
      let values: Record<string, unknown> | undefined;
      const builder = {
        select: vi.fn(() => builder),
        eq: vi.fn((column: string, value: unknown) => {
          filters.push({ column, value });
          return builder;
        }),
        update: vi.fn((input: Record<string, unknown>) => {
          values = input;
          return builder;
        }),
        maybeSingle: vi.fn(async () => ({ data: rows.customers.find((row) => filters.every((filter) => row[filter.column] === filter.value)) ?? null, error: null })),
        then(resolve: (value: { data: null; error: null }) => void) {
          rows.customers.forEach((row) => {
            if (filters.every((filter) => row[filter.column] === filter.value)) {
              Object.assign(row, values);
            }
          });
          resolve({ data: null, error: null });
        }
      };
      return builder;
    }
  };

  return { rows, client };
}
