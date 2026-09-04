import { validateStripeRuntimeConfig, validateStripeWebhookConfig } from "@/lib/checkout";
import { hasResendApiKey } from "@/lib/email";

export type LaunchReadinessStatus = "ready" | "warning" | "blocked";

export type LaunchReadinessCheck = {
  id: string;
  label: string;
  detail: string;
  status: LaunchReadinessStatus;
};

export function getLaunchReadinessChecks(env: NodeJS.ProcessEnv = process.env): LaunchReadinessCheck[] {
  const stripe = validateStripeRuntimeConfig(env);
  const webhook = validateStripeWebhookConfig(env);
  const databaseConfigured = Boolean(env.DATABASE_URL || (env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY));
  const adminConfigured = Boolean(env.ADMIN_EMAIL && env.ADMIN_PASSWORD && env.ADMIN_SESSION_SECRET);
  const customerAuthConfigured = Boolean(env.CUSTOMER_SESSION_SECRET || env.ADMIN_SESSION_SECRET);
  const resendConfigured = hasResendApiKey(env) && Boolean(env.RESEND_FROM_EMAIL);
  const hostedPagesConfigured = env.TAP_RATER_ENABLE_PRODUCTION_HOSTED_PAGES === "true";
  const billingPortalConfigured = env.STRIPE_BILLING_PORTAL_CONFIGURED === "true";
  const stripeCustomerEmailsConfigured = env.STRIPE_CUSTOMER_EMAILS_CONFIGURED === "true";

  return [
    {
      id: "database",
      label: "Database",
      detail: databaseConfigured ? "Persistent commerce storage is configured." : "DATABASE_URL or Supabase service credentials are missing.",
      status: databaseConfigured ? "ready" : "blocked"
    },
    {
      id: "stripe",
      label: "Stripe checkout",
      detail: stripe.ok ? `${stripe.mode === "live" ? "Live" : "Test"} keys match the configured mode.` : stripe.error,
      status: stripe.ok ? (stripe.mode === "live" ? "ready" : "warning") : "blocked"
    },
    {
      id: "stripe-webhook",
      label: "Stripe webhook",
      detail: webhook.ok ? "Webhook signing secret is configured." : webhook.error,
      status: webhook.ok ? "ready" : "blocked"
    },
    {
      id: "email",
      label: "Transactional email",
      detail: resendConfigured ? "Resend API key and sender are configured." : "RESEND_API_KEY or RESEND_FROM_EMAIL is missing.",
      status: resendConfigured ? "ready" : "blocked"
    },
    {
      id: "admin-auth",
      label: "Admin authentication",
      detail: adminConfigured ? "Admin credentials and signed sessions are configured." : "Admin credentials or session secret are missing.",
      status: adminConfigured ? "ready" : "blocked"
    },
    {
      id: "customer-auth",
      label: "Customer authentication",
      detail: customerAuthConfigured ? "Customer sessions can be signed." : "CUSTOMER_SESSION_SECRET is missing.",
      status: customerAuthConfigured ? "ready" : "blocked"
    },
    {
      id: "google-places",
      label: "Google Business search",
      detail: env.GOOGLE_PLACES_API_KEY ? "Google Places search is configured." : "Google Places key is missing; manual links still work.",
      status: env.GOOGLE_PLACES_API_KEY ? "ready" : "warning"
    },
    {
      id: "hosted-pages",
      label: "Multi-Link publishing",
      detail: hostedPagesConfigured ? "Production hosted pages are enabled." : "Production hosted-page publishing is disabled.",
      status: hostedPagesConfigured ? "ready" : "warning"
    },
    {
      id: "billing-portal",
      label: "Stripe Billing Portal",
      detail: billingPortalConfigured
        ? "Customers can update payment methods, review invoices, and cancel subscriptions."
        : "Dashboard configuration must be confirmed in Stripe.",
      status: billingPortalConfigured ? "ready" : "warning"
    },
    {
      id: "stripe-customer-emails",
      label: "Stripe customer emails",
      detail: stripeCustomerEmailsConfigured
        ? "Payment receipts, refund confirmations, and subscription recovery emails are enabled."
        : "Receipt and subscription recovery emails must be confirmed in Stripe.",
      status: stripeCustomerEmailsConfigured ? "ready" : "warning"
    },
    {
      id: "tax-legal",
      label: "Tax and legal approval",
      detail: "Virginia jurisdiction and taxable items still require accountant approval.",
      status: "warning"
    }
  ];
}

export function calculateLaunchReadinessPercent(checks: LaunchReadinessCheck[]) {
  if (!checks.length) return 0;
  const points = checks.reduce((total, check) => total + (check.status === "ready" ? 1 : check.status === "warning" ? 0.5 : 0), 0);
  return Math.round((points / checks.length) * 100);
}
