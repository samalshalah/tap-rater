import Link from "next/link";
import { PageHero, SectionShell } from "@/components/storefront/section";

export const metadata = {
  title: "Checkout Canceled | Tap Rater",
  description: "Your Tap Rater Stripe checkout was canceled."
};

export default function CheckoutCancelPage() {
  return (
    <main className="tr-public-shell text-ink">
      <PageHero
        eyebrow="Stripe checkout"
        title="Checkout canceled"
        body="No payment was completed. Your cart stays in the browser so you can adjust quantities or try checkout again."
      />
      <SectionShell tone="soft" spacing="compact">
        <div className="tr-container-narrow">
      <section className="tr-card p-6 sm:p-7">
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/cart" className="inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-brand">
            Return to cart
          </Link>
          <Link href="/shop" className="inline-flex min-h-11 items-center rounded-full border border-line px-5 text-sm font-semibold text-ink hover:border-ink">
            Shop products
          </Link>
        </div>
      </section>
        </div>
      </SectionShell>
    </main>
  );
}
