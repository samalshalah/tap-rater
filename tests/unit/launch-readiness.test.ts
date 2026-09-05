import { describe, expect, it } from "vitest";
import { calculateLaunchReadinessPercent, getLaunchReadinessChecks } from "@/lib/launch-readiness";

const configuredEnvironment: NodeJS.ProcessEnv = {
  NODE_ENV: "test",
  ADMIN_EMAIL: "admin@example.com",
  ADMIN_PASSWORD: "secret",
  ADMIN_SESSION_SECRET: "admin-session",
  CUSTOMER_SESSION_SECRET: "customer-session",
  DATABASE_URL: "postgres://example",
  GOOGLE_PLACES_API_KEY: "places-key",
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_example",
  RESEND_API_KEY: "re_example",
  RESEND_FROM_EMAIL: "Tap Rater <notifications@example.com>",
  STRIPE_BILLING_PORTAL_CONFIGURED: "true",
  STRIPE_CUSTOMER_EMAILS_CONFIGURED: "true",
  STRIPE_MODE: "test",
  STRIPE_SECRET_KEY: "sk_test_example",
  STRIPE_WEBHOOK_SECRET: "whsec_example",
  TAP_RATER_ENABLE_PRODUCTION_HOSTED_PAGES: "true"
};

describe("launch readiness", () => {
  it("reports confirmed Stripe Dashboard capabilities as ready", () => {
    const checks = getLaunchReadinessChecks(configuredEnvironment);

    expect(checks.find((check) => check.id === "billing-portal")?.status).toBe("ready");
    expect(checks.find((check) => check.id === "stripe-customer-emails")?.status).toBe("ready");
  });

  it("keeps test mode and tax approval visible as warnings", () => {
    const checks = getLaunchReadinessChecks(configuredEnvironment);

    expect(checks.find((check) => check.id === "stripe")?.status).toBe("warning");
    expect(checks.find((check) => check.id === "resend-webhook")?.status).toBe("warning");
    expect(checks.find((check) => check.id === "tax-legal")?.status).toBe("warning");
    expect(calculateLaunchReadinessPercent(checks)).toBe(88);
  });

  it("marks verified Resend delivery events ready when the signing secret exists", () => {
    const checks = getLaunchReadinessChecks({
      ...configuredEnvironment,
      RESEND_WEBHOOK_SECRET: "whsec_resend_example"
    });

    expect(checks.find((check) => check.id === "resend-webhook")?.status).toBe("ready");
    expect(calculateLaunchReadinessPercent(checks)).toBe(92);
  });
});
