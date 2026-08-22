import { describe, expect, it } from "vitest";
import { validateStripePublicConfig } from "@/lib/stripe-public-config";

function env(values: Partial<NodeJS.ProcessEnv>): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "test",
    ...values
  } as NodeJS.ProcessEnv;
}

describe("Stripe public config", () => {
  it("exposes only a test publishable key in test mode", () => {
    expect(
      validateStripePublicConfig(env({
        STRIPE_MODE: "test",
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_unit"
      }))
    ).toEqual({
      ok: true,
      mode: "test",
      publishableKey: "pk_test_unit"
    });
  });

  it("defaults to test mode when STRIPE_MODE is missing", () => {
    expect(
      validateStripePublicConfig(env({
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_unit"
      }))
    ).toMatchObject({
      ok: true,
      mode: "test"
    });
  });

  it("exposes only a live publishable key in live mode", () => {
    expect(
      validateStripePublicConfig(env({
        STRIPE_MODE: "live",
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_unit"
      }))
    ).toEqual({
      ok: true,
      mode: "live",
      publishableKey: "pk_live_unit"
    });
  });

  it("rejects secret keys before they can reach the browser", () => {
    expect(
      validateStripePublicConfig(env({
        STRIPE_MODE: "test",
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "sk_test_unit"
      }))
    ).toEqual({
      ok: false,
      mode: "test",
      error: "Stripe test publishable key is not configured. Admin must configure a pk_test_ publishable key."
    });
  });

  it("rejects publishable keys for the wrong Stripe mode", () => {
    expect(
      validateStripePublicConfig(env({
        STRIPE_MODE: "test",
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_live_unit"
      }))
    ).toEqual({
      ok: false,
      mode: "test",
      error: "Stripe test publishable key is not configured. Admin must configure a pk_test_ publishable key."
    });

    expect(
      validateStripePublicConfig(env({
        STRIPE_MODE: "live",
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_unit"
      }))
    ).toEqual({
      ok: false,
      mode: "live",
      error: "Stripe live publishable key is not configured. Admin must configure a pk_live_ publishable key."
    });
  });

  it("returns a clear developer error when the publishable key is missing", () => {
    expect(validateStripePublicConfig(env({ STRIPE_MODE: "test" }))).toEqual({
      ok: false,
      mode: "test",
      error: "Stripe test publishable key is not configured. Admin must configure a pk_test_ publishable key."
    });
  });

  it("rejects invalid Stripe mode before exposing any key", () => {
    expect(
      validateStripePublicConfig(env({
        STRIPE_MODE: "sandbox",
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test_unit"
      }))
    ).toEqual({
      ok: false,
      mode: "invalid",
      error: "Stripe mode is invalid. Set STRIPE_MODE to test or live."
    });
  });
});
