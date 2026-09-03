import { Suspense } from "react";
import { EmbeddedCheckoutClient } from "@/components/checkout/embedded-checkout";
import { validateStripePublicConfig } from "@/lib/stripe-public-config";
import { getTaxSettings } from "@/lib/tax-settings";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Checkout | Tap Rater",
  description: "Complete your Tap Rater order with secure embedded Stripe checkout."
};

export default async function CheckoutPage() {
  const stripePublicConfig = validateStripePublicConfig();
  const taxSettings = await getTaxSettings();

  return (
    <main className="bg-soft text-ink">
      <section className="tr-container tr-section">
        <Suspense fallback={<div className="tr-card p-8 text-sm font-semibold text-muted">Loading checkout...</div>}>
          <EmbeddedCheckoutClient stripePublicConfig={stripePublicConfig} taxSettings={taxSettings} />
        </Suspense>
      </section>
    </main>
  );
}
