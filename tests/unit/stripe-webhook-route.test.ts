import { afterEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/webhooks/stripe/route";

function createWebhookRequest() {
  return new Request("https://taprater.test/api/webhooks/stripe", {
    method: "POST",
    body: "{}"
  });
}

describe("Stripe webhook route configuration", () => {
  afterEach(() => {
    delete process.env.STRIPE_MODE;
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });

  it("requires a test webhook secret in default test mode", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_unit";
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_test_unit";

    const response = await POST(createWebhookRequest());
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({ error: "Stripe test webhook is not configured." });
  });

  it("rejects test keys in live webhook mode", async () => {
    process.env.STRIPE_MODE = "live";
    process.env.STRIPE_SECRET_KEY = "sk_test_unit";
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_test_unit";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_live_unit";

    const response = await POST(createWebhookRequest());
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({ error: "Stripe live mode is not configured. Use sk_live_ and pk_live_ keys only." });
  });

  it("accepts live webhook configuration before requiring a Stripe signature", async () => {
    process.env.STRIPE_MODE = "live";
    process.env.STRIPE_SECRET_KEY = "sk_live_unit";
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_live_unit";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_live_unit";

    const response = await POST(createWebhookRequest());
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({ error: "Stripe signature is missing." });
  });
});
