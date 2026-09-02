import { CartTable } from "@/components/cart/cart-table";
import { PageHero, SectionShell } from "@/components/storefront/section";
import { getStripeModeSafe } from "@/lib/checkout";

export const dynamic = "force-dynamic";

export default function CartPage() {
  const stripeMode = getStripeModeSafe() === "live" ? "live" : "test";

  return (
    <main className="tr-public-shell text-ink">
      <PageHero
        eyebrow="Cart"
        title="Review your order"
        body="Confirm each configured stand before Tap Rater reviews payment, shipping, and artwork details."
      />
      <SectionShell spacing="compact">
        <div className="tr-container">
          <CartTable stripeMode={stripeMode} />
        </div>
      </SectionShell>
    </main>
  );
}
