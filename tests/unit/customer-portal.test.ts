import { describe, expect, it, vi } from "vitest";
import { getCustomerPortalFromClient, type CustomerPortalDbClient } from "@/lib/customer-portal";

describe("customer portal repository", () => {
  it("loads businesses, devices, destinations, and tap counts for a customer email", async () => {
    const db = createCustomerPortalDb({
      customers: [{ id: "customer-1", email: "owner@example.com", name: "Owner" }],
      businesses: [{ id: "business-1", customer_id: "customer-1", business_name: "Local Shop", google_review_url: "https://example.com/review" }],
      devices: [
        {
          id: "device-1",
          device_code: "TR-TEST123",
          customer_id: "customer-1",
          business_id: "business-1",
          product_type: "google_review",
          service_mode: "basic_redirect",
          status: "active",
          destination_type: "google_review",
          destination_url: "https://example.com/review"
        }
      ],
      tap_events: [{ device_id: "device-1" }, { device_id: "device-1" }],
      orders: [
        {
          id: "order-1",
          stripe_checkout_session_id: "manual_123",
          email: "owner@example.com",
          status: "pending_payment",
          payment_status: "manual_unpaid",
          production_status: "blocked",
          shipping_status: "not_shipped",
          total_cents: 4900,
          currency: "usd",
          line_items_json: [
            {
              productId: "google-review-stand",
              optionId: "branded_qr_direct",
              optionLabel: "Branded + QR",
              title: "Google Review Stand",
              sku: "TR-GOOGLE",
              quantity: 1,
              unitAmountCents: 4900,
              lineSubtotalCents: 4900,
              setup: {
                businessName: "Local Shop",
                destinationUrl: "https://example.com/review"
              }
            }
          ]
        }
      ],
      hosted_subscriptions: [
        {
          id: "subscription-1",
          customer_id: "customer-1",
          hosted_page_url: "https://taprater.com/p/ABC123ABC123",
          permanent_code: "ABC123ABC123",
          status: "active",
          lifecycle_status: "ACTIVE",
          cancel_at_period_end: false
        }
      ]
    });

    const portal = await getCustomerPortalFromClient(db.client, "owner@example.com");

    expect(portal.customer).toMatchObject({ id: "customer-1", email: "owner@example.com" });
    expect(portal.businesses[0]).toMatchObject({ businessName: "Local Shop", googleReviewUrl: "https://example.com/review" });
    expect(portal.devices[0]).toMatchObject({
      deviceCode: "TR-TEST123",
      status: "active",
      destinationUrl: "https://example.com/review",
      tapCount: 2
    });
    expect(portal.orders[0]).toMatchObject({ reference: "manual_123", paymentStatus: "manual_unpaid", itemCount: 1 });
    expect(portal.stands[0]).toMatchObject({
      title: "Google Review Stand",
      kind: "branded",
      proofStatus: "needs_review",
      productionStatus: "blocked",
      shippingStatus: "not_shipped"
    });
    expect(portal.subscriptions[0]).toMatchObject({ hostedPageUrl: "https://taprater.com/p/ABC123ABC123", lifecycleStatus: "ACTIVE" });
  });

  it("returns empty portal data when customer is not found", async () => {
    const db = createCustomerPortalDb({ customers: [], businesses: [], devices: [], tap_events: [], orders: [], hosted_subscriptions: [] });

    const portal = await getCustomerPortalFromClient(db.client, "missing@example.com");

    expect(portal.customer).toBeNull();
    expect(portal.businesses).toEqual([]);
    expect(portal.devices).toEqual([]);
    expect(portal.orders).toEqual([]);
    expect(portal.stands).toEqual([]);
    expect(portal.subscriptions).toEqual([]);
  });
});

type TableName = "customers" | "businesses" | "devices" | "tap_events" | "orders" | "hosted_subscriptions";

function createCustomerPortalDb(seed: Record<TableName, Array<Record<string, unknown>>>) {
  const rows = {
    customers: [...seed.customers],
    businesses: [...seed.businesses],
    devices: [...seed.devices],
    tap_events: [...seed.tap_events],
    orders: [...seed.orders],
    hosted_subscriptions: [...seed.hosted_subscriptions]
  };

  const client = {
    from(table: TableName) {
      let filters: Array<{ column: string; value: unknown }> = [];
      const matchRows = () => rows[table].filter((row) => filters.every((filter) => row[filter.column] === filter.value));

      const builder = {
        select: vi.fn(() => builder),
        eq: vi.fn((column: string, value: unknown) => {
          filters.push({ column, value });
          return builder;
        }),
        maybeSingle: vi.fn(async () => ({ data: matchRows()[0] ?? null, error: null })),
        order: vi.fn(async () => ({ data: matchRows(), error: null })),
        then(resolve: (value: { data: Array<Record<string, unknown>>; error: null }) => void) {
          resolve({ data: matchRows(), error: null });
        }
      };

      return builder;
    }
  };

  return { client: client as unknown as CustomerPortalDbClient };
}
