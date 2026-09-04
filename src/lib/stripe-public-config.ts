import {
  getStripeModeSafe,
  getStripePublishableKey,
  isStripeLivePublishableKey,
  isStripeTestPublishableKey,
  type StripeMode
} from "@/lib/checkout";

export type StripePublicConfig =
  | {
      ok: true;
      mode: StripeMode;
      publishableKey: string;
    }
  | {
      ok: false;
      mode: StripeMode | "invalid";
      error: string;
    };

export function validateStripePublicConfig(env: NodeJS.ProcessEnv = process.env): StripePublicConfig {
  const mode = getStripeModeSafe(env.STRIPE_MODE);

  if (mode === "invalid") {
    return {
      ok: false,
      mode,
      error: "Stripe mode is invalid. Set STRIPE_MODE to test or live."
    };
  }

  const publishableKey = getStripePublishableKey(env);

  if (mode === "test" && !isStripeTestPublishableKey(publishableKey)) {
    return {
      ok: false,
      mode,
      error: "Stripe test publishable key is not configured. Admin must configure a pk_test_ publishable key."
    };
  }

  if (mode === "live" && !isStripeLivePublishableKey(publishableKey)) {
    return {
      ok: false,
      mode,
      error: "Stripe live publishable key is not configured. Admin must configure a pk_live_ publishable key."
    };
  }

  return {
    ok: true,
    mode,
    publishableKey: publishableKey!
  };
}
