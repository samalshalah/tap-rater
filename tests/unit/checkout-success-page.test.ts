import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CheckoutSuccessPage from "@/app/checkout/success/page";
import { formatOrderReference } from "@/lib/order-reference";

const { maybeSingle, from, purchaseEvent } = vi.hoisted(() => {
  const maybeSingle = vi.fn();
  const from = vi.fn(() => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }));
  return { maybeSingle, from, purchaseEvent: vi.fn((_props: unknown) => null) };
});

vi.mock("@/lib/db", () => ({ hasSupabaseAdminConfig: () => true, getSupabaseAdmin: () => ({ from }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/components/checkout/checkout-success-effects", () => ({ CheckoutSuccessEffects: () => null }));
vi.mock("@/components/analytics/ecommerce-events", () => ({ PurchaseAnalyticsEvent: purchaseEvent }));

const reference = `cs_test_${"a".repeat(70)}`;

beforeEach(() => {
  vi.clearAllMocks();
  maybeSingle.mockResolvedValue({ data: {
    stripe_checkout_session_id: reference,
    total_cents: 6333,
    customer_details_json: { create_account: true }
  } });
});

describe("checkout success account guidance", () => {
  it("keeps setup and shipping guidance accurate for existing customers", () => {
    const shipping = readFileSync("src/components/checkout/embedded-checkout.tsx", "utf8");
    const setup = readFileSync("src/components/product/product-setup-chooser.tsx", "utf8");
    expect(shipping).toContain("existing customers keep their password.");
    expect(shipping).not.toContain("the customer receives an activation email");
    expect(setup).not.toContain("after account activation");
    expect(setup).toContain("from your account after payment");
  });

  it("covers existing and new accounts without exposing account status", async () => {
    const html = renderToStaticMarkup(await CheckoutSuccessPage({ searchParams: Promise.resolve({ session_id: reference }) }));
    expect(html).toContain("Sign in with your existing password.");
    expect(html).toContain("New customers will receive an activation email after payment is confirmed.");
    expect(html).not.toContain("Check your email for the activation link to set");
    expect(html).toContain('href="/account/orders"');
    expect(from).toHaveBeenCalledTimes(1);
    expect(from).toHaveBeenCalledWith("orders");
  });

  it("does not promise an activation email when no account was requested", async () => {
    maybeSingle.mockResolvedValue({ data: { stripe_checkout_session_id: reference, customer_details_json: { create_account: false } } });
    const html = renderToStaticMarkup(await CheckoutSuccessPage({ searchParams: Promise.resolve({ session_id: reference }) }));
    expect(html).not.toContain("activation email");
  });

  it("shows a ten-character order number while looking up the original payment reference", async () => {
    const html = renderToStaticMarkup(await CheckoutSuccessPage({ searchParams: Promise.resolve({ session_id: reference }) }));
    expect(html).toContain("break-all font-medium");
    expect(html).toContain(formatOrderReference(reference));
    expect(formatOrderReference(reference)).toMatch(/^[A-Z0-9]{10}$/);
    expect(html).not.toContain(reference);
    expect(html).not.toContain("webhook");
    expect(html).toContain("$63.33");
  });

  it("does not invent account guidance for a missing order", async () => {
    maybeSingle.mockResolvedValue({ data: null });
    const html = renderToStaticMarkup(await CheckoutSuccessPage({ searchParams: Promise.resolve({ session_id: reference }) }));
    expect(html).not.toContain("activation email");
    expect(html).not.toContain("Order number:");
  });

  it("never marks a test checkout redirect as a purchase", async () => {
    const html = renderToStaticMarkup(await CheckoutSuccessPage({ searchParams: Promise.resolve({ session_id: reference }) }));
    expect(purchaseEvent.mock.calls[0]?.[0]).toEqual({ purchase: null, pending: false });
    expect(html).not.toContain("Participation is optional");
  });

  it("offers the survey with a privacy disclosure only for a verified live paid order", async () => {
    maybeSingle.mockResolvedValue({ data: {
      id: "751be0f5-2003-4318-a7fd-45fd46b54d3d", stripe_checkout_session_id: "cs_live_example123",
      status: "paid", payment_status: "paid", email: "buyer@example.com",
      shipping_address_json: { address: { country: "US" } },
    } });
    const html = renderToStaticMarkup(await CheckoutSuccessPage({ searchParams: Promise.resolve({ session_id: "cs_live_example123" }) }));
    expect(html).toContain("Participation is optional");
    expect(html).toContain('href="/privacy-policy"');
  });

  it("retries pending live confirmation without sending a purchase", async () => {
    maybeSingle.mockResolvedValue({ data: { stripe_checkout_session_id: "cs_live_example123", status: "pending_payment", payment_status: "unpaid" } });
    renderToStaticMarkup(await CheckoutSuccessPage({ searchParams: Promise.resolve({ session_id: "cs_live_example123" }) }));
    expect(purchaseEvent.mock.calls[0]?.[0]).toEqual({ purchase: null, pending: true });
  });

  it("does not mount purchase measurement for a manual order", async () => {
    renderToStaticMarkup(await CheckoutSuccessPage({ searchParams: Promise.resolve({ manual_order: "manual123" }) }));
    expect(purchaseEvent).not.toHaveBeenCalled();
  });
});
