import { describe, expect, it } from "vitest";
import { customerReviewOrder } from "@/lib/google-customer-reviews";

const paid = {
  id: "751be0f5-2003-4318-a7fd-45fd46b54d3d",
  stripe_checkout_session_id: "cs_live_example",
  status: "paid", payment_status: "paid", email: "buyer@example.com",
  shipping_address_json: { address: { country: "US" } },
};

describe("Google Customer Reviews eligibility", () => {
  it("uses six business days and New York's confirmation date", () => {
    expect(customerReviewOrder(paid, new Date("2026-10-10T15:00:00Z"))).toEqual({ merchant_id: 5872950011, order_id: paid.id, email: paid.email, delivery_country: "US", estimated_delivery_date: "2026-10-19" });
    expect(customerReviewOrder(paid, new Date("2026-10-10T02:00:00Z"))?.estimated_delivery_date).toBe("2026-10-19");
  });
  it.each([
    { status: "pending_payment" }, { payment_status: "unpaid" },
    { stripe_checkout_session_id: "cs_test_example" }, { stripe_checkout_session_id: "manual_example" },
    { refund_status: "succeeded" }, { stripe_refund_id: "re_example" },
    { email: "" }, { email: "invalid" }, { id: "" },
    { shipping_address_json: null }, { shipping_address_json: { address: { country: "CA" } } },
  ])("excludes ineligible or incomplete orders: %j", patch => {
    expect(customerReviewOrder({ ...paid, ...patch })).toBeNull();
  });
  it("never passes a full shipping address or Stripe checkout token to Google", () => {
    const result = JSON.stringify(customerReviewOrder({ ...paid, customer_name: "Private Name", shipping_address_json: { address: { country: "US", line1: "Private Street" } } }));
    expect(result).not.toContain("Private");
    expect(result).not.toContain("cs_live");
  });
});
