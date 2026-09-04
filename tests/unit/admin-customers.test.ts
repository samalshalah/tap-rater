import { describe, expect, it } from "vitest";
import { buildAdminCustomerSummaries } from "@/lib/admin-customers";

describe("admin customer summaries", () => {
  it("combines accounts, guest orders, businesses, and active subscriptions", () => {
    const result = buildAdminCustomerSummaries({
      customers: [
        {
          id: "customer-1",
          email: "OWNER@EXAMPLE.COM",
          name: "Owner Example",
          phone: "555-0100",
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
      activeSubscriptionCount: 1
    });
  });
});
