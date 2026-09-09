import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CheckoutSuccessPage from "@/app/checkout/success/page";

const { maybeSingle, from } = vi.hoisted(() => {
  const maybeSingle = vi.fn();
  const from = vi.fn(() => ({ select: () => ({ eq: () => ({ maybeSingle }) }) }));
  return { maybeSingle, from };
});

vi.mock("@/lib/db", () => ({ hasSupabaseAdminConfig: () => true, getSupabaseAdmin: () => ({ from }) }));
vi.mock("@/components/checkout/checkout-success-effects", () => ({ CheckoutSuccessEffects: () => null }));

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

  it("keeps long order references wrappable and preserves their value", async () => {
    const html = renderToStaticMarkup(await CheckoutSuccessPage({ searchParams: Promise.resolve({ session_id: reference }) }));
    expect(html).toContain("break-all font-medium");
    expect(html).toContain(reference);
    expect(html).toContain("$63.33");
  });

  it("does not invent account guidance for a missing order", async () => {
    maybeSingle.mockResolvedValue({ data: null });
    const html = renderToStaticMarkup(await CheckoutSuccessPage({ searchParams: Promise.resolve({ session_id: reference }) }));
    expect(html).not.toContain("activation email");
    expect(html).not.toContain("Order number:");
  });
});
