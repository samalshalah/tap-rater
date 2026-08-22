import { Suspense } from "react";
import { EmbeddedCheckoutClient } from "@/components/checkout/embedded-checkout";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Checkout | Tap Rater",
  description: "Complete your Tap Rater order with secure embedded Stripe checkout."
};

export default function CheckoutPage() {
  return (
    <main className="bg-[#f7f8fa] px-4 py-10 text-ink sm:px-6 lg:px-8">
      <section className="mx-auto max-w-6xl">
        <Suspense fallback={<div className="rounded-[22px] border border-line bg-white p-8 text-sm font-semibold text-muted shadow-sm">Loading checkout...</div>}>
          <EmbeddedCheckoutClient />
        </Suspense>
      </section>
    </main>
  );
}
