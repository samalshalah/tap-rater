import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
const query = vi.hoisted(() => vi.fn());
vi.mock("@neondatabase/serverless", () => ({ neon: () => ({ query }) }));
vi.mock("@/lib/admin-auth", () => ({
  isValidAdminSession: (value: string) => value === "valid-admin",
}));
import { captureAttribution, campaignLabel } from "@/lib/analytics-attribution";
import {
  analyticsEventSchema,
  requestIsInternal,
  linkAnalyticsCheckout,
  flushAnalyticsPurchases,
} from "@/lib/storefront-analytics-server";
const env = {
  DATABASE_URL: "postgres://test",
  GA4_API_SECRET: "test-secret",
  GA4_MEASUREMENT_ID: "G-MVBHN8KW2S",
  GA4_ENABLED: "true",
};
const order = {
  id: "12345678-1234-4123-8123-123456789abc",
  status: "paid",
  payment_status: "paid",
  stripe_checkout_session_id: "cs_live_abc",
  currency: "usd",
  total_cents: 5334,
  shipping_amount_cents: 1200,
  customer_details_json: {
    email: "private@example.com",
    tax_summary: { amount_cents: 234 },
  },
  line_items_json: [
    {
      productId: "google-review-stand",
      optionId: "standard_direct",
      quantity: 1,
      unitAmountCents: 3900,
      lineSubtotalCents: 3900,
    },
  ],
};
beforeEach(() => {
  query.mockReset();
  vi.stubEnv("DATABASE_URL", env.DATABASE_URL);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
describe("attribution and exclusions", () => {
  it("retains campaign labels without leaking arbitrary parameters", () => {
    expect(
      captureAttribution(
        "?utm_source=Facebook&utm_medium=paid_social&utm_campaign=fall-2026&email=private@example.com",
        "",
      ),
    ).toEqual({
      source: "facebook",
      medium: "paid_social",
      campaign: "fall-2026",
    });
    expect(campaignLabel("private@example.com")).toBeUndefined();
    expect(campaignLabel("https://private.example.com")).toBeUndefined();
    expect(
      captureAttribution("", "https://private.example.com/customer/secret"),
    ).toEqual({ source: "other-referral", medium: "referral" });
  });
  it("excludes authenticated admin browsers and explicit testing cookies", () => {
    expect(
      requestIsInternal(
        new Request("https://taprater.com", {
          headers: { cookie: "taprater_admin=valid-admin" },
        }),
      ),
    ).toBe(true);
    expect(
      requestIsInternal(
        new Request("https://taprater.com", {
          headers: { cookie: "taprater_analytics_internal=1" },
        }),
      ),
    ).toBe(true);
    expect(requestIsInternal(new Request("https://taprater.com"))).toBe(false);
  });
  it("does not accept browser supplied purchases or private page paths", () => {
    const data = {
      id: crypto.randomUUID(),
      sessionId: crypto.randomUUID(),
      name: "page_view",
      page: "/cart",
      landing: "/",
      source: "google",
      medium: "organic",
      device: "mobile",
    };
    expect(analyticsEventSchema.safeParse(data).success).toBe(true);
    expect(
      analyticsEventSchema.safeParse({ ...data, name: "purchase" }).success,
    ).toBe(false);
    expect(
      analyticsEventSchema.safeParse({ ...data, page: "/account/orders" })
        .success,
    ).toBe(false);
    expect(
      analyticsEventSchema.safeParse({
        ...data,
        page: "/checkout?session_id=secret",
      }).success,
    ).toBe(false);
  });
  it("binds internal checkouts as excluded without forwarding GA identifiers", async () => {
    query.mockResolvedValue([]);
    await linkAnalyticsCheckout(
      new Request("https://taprater.com", {
        headers: {
          cookie: "taprater_analytics_internal=1",
          "x-taprater-analytics": JSON.stringify({
            sessionId: crypto.randomUUID(),
            clientId: "123.456",
            gaSessionId: "123",
          }),
        },
      }),
      "cs_live_test",
    );
    expect(query.mock.calls[0][1]).toEqual([
      "cs_live_test",
      null,
      true,
      null,
      null,
      false,
    ]);
  });
});
describe("server purchases", () => {
  const claim = {
    stripe_session_id: "cs_live_abc",
    ga_client_id: "123.456",
    ga_session_id: "1791576000",
    purchase_at: "2026-10-09T20:00:00Z",
  };
  it("submits only verified order totals without private fields", async () => {
    query
      .mockResolvedValueOnce([claim])
      .mockResolvedValueOnce([order])
      .mockResolvedValueOnce([]);
    const send = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", send);
    expect(await flushAnalyticsPurchases(env)).toEqual({ sent: 1 });
    const body = JSON.parse(send.mock.calls[0][1].body);
    expect(body.events[0].params.value).toBe(39);
    expect(body.events[0].params.transaction_id).toBe(order.id);
    expect(JSON.stringify(body)).not.toMatch(/private|cs_live/);
    expect(query.mock.calls[2][0]).toContain("sent_at=now()");
    expect(query.mock.calls[0][0]).toContain("s.consent AND NOT s.excluded");
    expect(query.mock.calls[0][0]).toContain("a.sent_at IS NULL");
  });
  it("keeps transport failures retryable", async () => {
    query
      .mockResolvedValueOnce([claim])
      .mockResolvedValueOnce([order])
      .mockResolvedValueOnce([]);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    expect(await flushAnalyticsPurchases(env)).toEqual({ sent: 0 });
    expect(query.mock.calls[2][0]).toContain("retrying");
  });
  it("refuses mismatched totals and test-mode orders even if selected", async () => {
    for (const change of [
      { total_cents: 1 },
      { stripe_checkout_session_id: "cs_test_abc" },
    ]) {
      query.mockReset();
      query.mockImplementation(async (sql: string) =>
        sql.startsWith("SELECT *")
          ? [{ ...order, ...change }]
          : sql.includes("RETURNING c.*")
            ? [claim]
            : [],
      );
      const send = vi.fn();
      vi.stubGlobal("fetch", send);
      await flushAnalyticsPurchases(env);
      expect(send).not.toHaveBeenCalled();
      expect(query.mock.calls[2][0]).toContain("invalid_order");
    }
  });
});
