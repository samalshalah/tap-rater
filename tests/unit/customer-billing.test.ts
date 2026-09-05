import { afterEach, describe, expect, it } from "vitest";
import { createCustomerSessionValue } from "@/lib/customer-auth";
import {
  findAuthenticatedStripeCustomerIdForCheckout,
  findStripeCustomerIdForEmail,
  type CustomerBillingDbClient
} from "@/lib/customer-billing";

describe("customer billing profiles", () => {
  afterEach(() => {
    delete process.env.ADMIN_SESSION_SECRET;
    delete process.env.CUSTOMER_SESSION_SECRET;
  });

  it("opens only the selected subscription profile owned by the signed-in customer", async () => {
    const client = createBillingDb({
      customers: [
        { id: "customer-1", email: "owner@example.com" },
        { id: "customer-2", email: "other@example.com" }
      ],
      hosted_subscriptions: [
        { id: "subscription-1", customer_id: "customer-1", stripe_customer_id: "cus_owner", created_at: "2026-09-01" },
        { id: "subscription-2", customer_id: "customer-2", stripe_customer_id: "cus_other", created_at: "2026-09-02" }
      ],
      orders: []
    });

    await expect(findStripeCustomerIdForEmail(client, "owner@example.com", { subscriptionId: "subscription-1" })).resolves.toBe("cus_owner");
    await expect(findStripeCustomerIdForEmail(client, "owner@example.com", { subscriptionId: "subscription-2" })).resolves.toBeNull();
  });

  it("uses the newest subscription profile as the customer's canonical Stripe profile", async () => {
    const client = createBillingDb({
      customers: [{ id: "customer-1", email: "owner@example.com", account_status: "active" }],
      hosted_subscriptions: [
        { id: "subscription-1", customer_id: "customer-1", stripe_customer_id: "cus_older", created_at: "2026-09-01" },
        { id: "subscription-2", customer_id: "customer-1", stripe_customer_id: "cus_newer", created_at: "2026-09-02" }
      ],
      orders: []
    });

    await expect(findStripeCustomerIdForEmail(client, "owner@example.com")).resolves.toBe("cus_newer");
  });

  it("reuses a Stripe profile only when the signed session matches the checkout email", async () => {
    process.env.CUSTOMER_SESSION_SECRET = "customer-session-secret-for-tests";
    const client = createBillingDb({
      customers: [{ id: "customer-1", email: "owner@example.com", account_status: "active" }],
      hosted_subscriptions: [
        {
          id: "subscription-1",
          customer_id: "customer-1",
          stripe_customer_id: "cus_owner",
          stripe_checkout_session_id: "cs_test_owner",
          created_at: "2026-09-01"
        }
      ],
      orders: []
    });
    const session = createCustomerSessionValue("owner@example.com");
    const request = new Request("https://taprater.com/api/checkout", {
      headers: { cookie: `taprater_customer=${encodeURIComponent(session)}` }
    });

    await expect(findAuthenticatedStripeCustomerIdForCheckout(client, request, "OWNER@example.com", "test")).resolves.toBe("cus_owner");
    await expect(findAuthenticatedStripeCustomerIdForCheckout(client, request, "other@example.com", "test")).resolves.toBeNull();
  });

  it("does not reuse a test-mode Stripe profile after checkout switches to live mode", async () => {
    process.env.CUSTOMER_SESSION_SECRET = "customer-session-secret-for-tests";
    const client = createBillingDb({
      customers: [{ id: "customer-1", email: "owner@example.com", account_status: "active" }],
      hosted_subscriptions: [
        {
          id: "subscription-1",
          customer_id: "customer-1",
          stripe_customer_id: "cus_test_profile",
          stripe_checkout_session_id: "cs_test_123",
          created_at: "2026-09-01"
        }
      ],
      orders: []
    });
    const session = createCustomerSessionValue("owner@example.com");
    const request = new Request("https://taprater.com/api/checkout", {
      headers: { cookie: `taprater_customer=${session}` }
    });

    await expect(findAuthenticatedStripeCustomerIdForCheckout(client, request, "owner@example.com", "live")).resolves.toBeNull();
  });

  it("does not reuse saved Stripe details after the customer resets their password", async () => {
    process.env.CUSTOMER_SESSION_SECRET = "customer-session-secret-for-tests";
    const issuedAt = Date.now() - 1000;
    const client = createBillingDb({
      customers: [{ id: "customer-1", email: "owner@example.com", account_status: "active", sessions_invalid_before: new Date().toISOString() }],
      hosted_subscriptions: [{ customer_id: "customer-1", stripe_customer_id: "cus_owner", stripe_checkout_session_id: "cs_test_owner" }],
      orders: []
    });
    const request = new Request("https://taprater.com/api/checkout", {
      headers: { cookie: `taprater_customer=${createCustomerSessionValue("owner@example.com", issuedAt)}` }
    });
    await expect(findAuthenticatedStripeCustomerIdForCheckout(client, request, "owner@example.com", "test")).resolves.toBeNull();
  });

  it("does not reuse saved Stripe details from a disabled account session", async () => {
    process.env.CUSTOMER_SESSION_SECRET = "customer-session-secret-for-tests";
    const client = createBillingDb({
      customers: [{ id: "customer-1", email: "owner@example.com", account_status: "disabled" }],
      hosted_subscriptions: [
        {
          id: "subscription-1",
          customer_id: "customer-1",
          stripe_customer_id: "cus_owner",
          stripe_checkout_session_id: "cs_test_owner",
          created_at: "2026-09-01"
        }
      ],
      orders: []
    });
    const session = createCustomerSessionValue("owner@example.com");
    const request = new Request("https://taprater.com/api/checkout", {
      headers: { cookie: `taprater_customer=${session}` }
    });

    await expect(findAuthenticatedStripeCustomerIdForCheckout(client, request, "owner@example.com", "test")).resolves.toBeNull();
  });
});

type TableName = "customers" | "hosted_subscriptions" | "orders";

function createBillingDb(seed: Record<TableName, Array<Record<string, unknown>>>) {
  const rows = {
    customers: [...seed.customers],
    hosted_subscriptions: [...seed.hosted_subscriptions],
    orders: [...seed.orders]
  };

  return {
    from(table: TableName) {
      let filters: Array<{ column: string; value: unknown }> = [];
      let orderBy: { column: string; ascending: boolean } | null = null;
      let rowLimit: number | null = null;
      const matchRows = () => {
        const matched = rows[table].filter((row) => filters.every((filter) => row[filter.column] === filter.value));
        if (orderBy) {
          matched.sort((left, right) => {
            const comparison = String(left[orderBy!.column] ?? "").localeCompare(String(right[orderBy!.column] ?? ""));
            return orderBy!.ascending ? comparison : -comparison;
          });
        }
        return rowLimit === null ? matched : matched.slice(0, rowLimit);
      };

      const builder = {
        select() {
          return builder;
        },
        eq(column: string, value: unknown) {
          filters.push({ column, value });
          return builder;
        },
        order(column: string, options: { ascending: boolean }) {
          orderBy = { column, ascending: options.ascending };
          return builder;
        },
        limit(value: number) {
          rowLimit = value;
          return builder;
        },
        async maybeSingle() {
          return { data: matchRows()[0] ?? null, error: null };
        },
        then(resolve: (value: { data: Array<Record<string, unknown>>; error: null }) => void) {
          resolve({ data: matchRows(), error: null });
        }
      };

      return builder;
    }
  } as CustomerBillingDbClient;
}
