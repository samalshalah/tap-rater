import { CartTable } from "@/components/cart/cart-table";
import { SectionShell } from "@/components/storefront/section";
import { getStripeModeSafe } from "@/lib/checkout";

export const dynamic = "force-dynamic";

export default function CartPage() {
  const stripeMode = getStripeModeSafe() === "live" ? "live" : "test";

  return (
    <main className="tr-public-shell text-ink">
      <SectionShell spacing="compact">
        <div className="tr-container">
          <p className="tr-eyebrow">Cart</p>
          <h1 className="mt-4 max-w-4xl text-[2.1rem] font-medium leading-tight text-ink sm:text-[2.55rem] md:text-[2.85rem]">
            Review your order
          </h1>
          <p className="tr-body mt-4 max-w-3xl text-base">
            Confirm each configured stand before Tap Rater reviews proof, payment, shipping, and production details.
          </p>
          <div className="mt-9">
            <CartTable stripeMode={stripeMode} />
          </div>
        </div>
      </SectionShell>
    </main>
  );
}
