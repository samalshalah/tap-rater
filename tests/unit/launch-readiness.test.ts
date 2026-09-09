import { describe, expect, it } from "vitest";
import { calculateLaunchReadinessPercent, getLaunchReadinessChecks, getStripeModeSummary } from "@/lib/launch-readiness";

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

  it("counts valid TEST mode as configured and excludes owner approvals from configuration scoring", () => {
    const checks = getLaunchReadinessChecks(configuredEnvironment);

    expect(checks.find((check) => check.id === "stripe")?.status).toBe("ready");
    expect(checks.find((check) => check.id === "resend-webhook")?.status).toBe("warning");
    expect(checks.find((check) => check.id === "tax-legal")).toBeUndefined();
    expect(checks).toHaveLength(11);
    expect(calculateLaunchReadinessPercent(checks)).toBe(95);
  });

  it("can reach 100% configuration in TEST without claiming verified event delivery", () => {
    const checks = getLaunchReadinessChecks({
      ...configuredEnvironment,
      RESEND_WEBHOOK_SECRET: "whsec_resend_example"
    });

    expect(checks.find((check) => check.id === "resend-webhook")?.status).toBe("ready");
    expect(checks.find((check) => check.id === "resend-webhook")?.detail).toContain("actual event delivery is not checked here");
    expect(calculateLaunchReadinessPercent(checks)).toBe(100);
    expect(getStripeModeSummary(configuredEnvironment)).toMatchObject({ label: "TEST", status: "ready" });
    expect(getStripeModeSummary(configuredEnvironment).detail).toContain("No real-money payment proof");
  });

  it("does not treat matching live keys as launch or payment proof", () => {
    const env = { ...configuredEnvironment, STRIPE_MODE: "live", STRIPE_SECRET_KEY: "sk_live_example", NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_example" };
    expect(getLaunchReadinessChecks(env).find((check) => check.id === "stripe")?.status).toBe("ready");
    expect(getStripeModeSummary(env)).toMatchObject({ label: "LIVE", status: "warning" });
    expect(getStripeModeSummary(env).detail).toContain("does not establish owner authorization");
  });

  it.each([
    { STRIPE_MODE: "invalid" },
    { STRIPE_SECRET_KEY: "sk_live_mismatched" },
    { NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_mismatched" },
    { STRIPE_SECRET_KEY: undefined },
    { STRIPE_MODE: "live", STRIPE_SECRET_KEY: "sk_live_example", NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_example", STRIPE_WEBHOOK_SECRET: undefined }
  ])("keeps invalid Stripe configuration blocked: %j", (patch) => {
    const env = { ...configuredEnvironment, ...patch };
    expect(getLaunchReadinessChecks(env).find((check) => check.id === "stripe")?.status).toBe("blocked");
    expect(getStripeModeSummary(env)).toMatchObject({ label: "Configuration error", status: "blocked" });
  });

  it("preserves missing integration failures and optional warnings", () => {
    const checks = getLaunchReadinessChecks({ NODE_ENV: "test" });
    for (const id of ["database", "stripe", "stripe-webhook", "email", "admin-auth", "customer-auth"]) {
      expect(checks.find((check) => check.id === id)?.status).toBe("blocked");
    }
    for (const id of ["resend-webhook", "google-places", "hosted-pages", "billing-portal", "stripe-customer-emails"]) {
      expect(checks.find((check) => check.id === id)?.status).toBe("warning");
    }
  });

  it("does not call configuration flags new Dashboard or delivery verification", () => {
    const checks = getLaunchReadinessChecks(configuredEnvironment);
    expect(checks.find((check) => check.id === "billing-portal")?.detail).toContain("recorded as confirmed");
    expect(checks.find((check) => check.id === "stripe-customer-emails")?.detail).toContain("not tested here");
  });

  it("never serializes secrets into checks or the mode summary", () => {
    const result = JSON.stringify({ checks: getLaunchReadinessChecks(configuredEnvironment), mode: getStripeModeSummary(configuredEnvironment) });
    for (const key of ["ADMIN_PASSWORD", "ADMIN_SESSION_SECRET", "CUSTOMER_SESSION_SECRET", "DATABASE_URL", "RESEND_API_KEY", "STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"]) {
      expect(result).not.toContain(`\"${configuredEnvironment[key]}\"`);
    }
  });

  it("scores an empty checklist as zero", () => {
    expect(calculateLaunchReadinessPercent([])).toBe(0);
  });
});
