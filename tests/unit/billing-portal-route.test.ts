import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createPortalSession: vi.fn(),
  getSupabaseAdmin: vi.fn(),
  requireCustomerApi: vi.fn()
}));

vi.mock("@/lib/customer-auth", () => ({
  requireCustomerApi: mocks.requireCustomerApi
}));

vi.mock("@/lib/db", () => ({
  getSupabaseAdmin: mocks.getSupabaseAdmin,
  hasSupabaseAdminConfig: () => true
}));

vi.mock("@/lib/checkout", () => ({
  getCheckoutSiteUrl: (origin: string) => origin,
  getStripeClient: () => ({ billingPortal: { sessions: { create: mocks.createPortalSession } } }),
  validateStripeRuntimeConfig: () => ({ ok: true, mode: "test" })
}));

import { POST } from "@/app/api/account/billing-portal/route";

describe("customer billing portal route", () => {
  beforeEach(() => {
    mocks.createPortalSession.mockReset();
    mocks.createPortalSession.mockResolvedValue({ url: "https://billing.stripe.test/session" });
    mocks.requireCustomerApi.mockReset();
    mocks.requireCustomerApi.mockResolvedValue({ response: null, session: { email: "owner@example.com" } });
    mocks.getSupabaseAdmin.mockReset();
    mocks.getSupabaseAdmin.mockReturnValue(createBillingDb());
  });

  it("creates a portal session for the selected subscription owned by the customer", async () => {
    const response = await POST(createRequest("subscription-1"));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://billing.stripe.test/session");
    expect(mocks.createPortalSession).toHaveBeenCalledWith({
      customer: "cus_owner",
      return_url: "https://taprater.com/account/orders"
    });
  });

  it("rejects a selected subscription owned by another customer", async () => {
    const response = await POST(createRequest("subscription-2"));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("billing_error=");
    expect(mocks.createPortalSession).not.toHaveBeenCalled();
  });

  it("rejects malformed subscription identifiers before querying Stripe", async () => {
    const response = await POST(createRequest("subscription/../../other"));

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toContain("billing_error=");
    expect(mocks.createPortalSession).not.toHaveBeenCalled();
  });
});

function createRequest(subscriptionId: string) {
  return new Request("https://taprater.com/api/account/billing-portal", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ subscription_id: subscriptionId })
  });
}

function createBillingDb() {
  const rows: Record<string, Array<Record<string, unknown>>> = {
    customers: [
      { id: "customer-1", email: "owner@example.com" },
      { id: "customer-2", email: "other@example.com" }
    ],
    hosted_subscriptions: [
      {
        id: "subscription-1",
        customer_id: "customer-1",
        stripe_customer_id: "cus_owner",
        stripe_checkout_session_id: "cs_test_owner"
      },
      {
        id: "subscription-2",
        customer_id: "customer-2",
        stripe_customer_id: "cus_other",
        stripe_checkout_session_id: "cs_test_other"
      }
    ],
    orders: []
  };

  return {
    from(table: string) {
      const filters: Array<{ column: string; value: unknown }> = [];
      const matchingRows = () => (rows[table] ?? []).filter((row) => filters.every((filter) => row[filter.column] === filter.value));
      const builder = {
        select() {
          return builder;
        },
        eq(column: string, value: unknown) {
          filters.push({ column, value });
          return builder;
        },
        async maybeSingle() {
          return { data: matchingRows()[0] ?? null, error: null };
        }
      };
      return builder;
    }
  };
}
