import { CartTable } from "@/components/cart/cart-table";
import { PageHero, SectionShell } from "@/components/storefront/section";
import { getStripeModeSafe } from "@/lib/checkout";
import { validateStripePublicConfig } from "@/lib/stripe-public-config";

export const dynamic = "force-dynamic";

export default function CartPage() {
  const stripeMode = getStripeModeSafe() === "live" ? "live" : "test";
  const stripeCheckoutEnabled = validateStripePublicConfig().ok;

  return (
    <main className="tr-public-shell text-ink">
      <PageHero
        eyebrow="Cart"
        title="Review your order"
        body="Confirm each configured stand before Tap Rater reviews payment, shipping, and artwork details."
      />
      <SectionShell spacing="compact">
        <div className="tr-container">
          <CartTable stripeMode={stripeMode} stripeCheckoutEnabled={stripeCheckoutEnabled} />
        </div>
      </SectionShell>
    </main>
  );
}
