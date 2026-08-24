import { Suspense } from "react";
import { EmbeddedCheckoutClient } from "@/components/checkout/embedded-checkout";
import { validateStripePublicConfig } from "@/lib/stripe-public-config";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Checkout | Tap Rater",
  description: "Complete your Tap Rater order with secure embedded Stripe checkout."
};

export default function CheckoutPage() {
  const stripePublicConfig = validateStripePublicConfig();

  return (
    <main className="bg-soft text-ink">
      <section className="tr-container tr-section">
        <Suspense fallback={<div className="tr-card p-8 text-sm font-semibold text-muted">Loading checkout...</div>}>
          <EmbeddedCheckoutClient stripePublicConfig={stripePublicConfig} />
        </Suspense>
      </section>
    </main>
  );
}
