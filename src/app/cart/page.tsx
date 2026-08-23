import { CartTable } from "@/components/cart/cart-table";
import { getStripeModeSafe } from "@/lib/checkout";

export const dynamic = "force-dynamic";

export default function CartPage() {
  const stripeMode = getStripeModeSafe() === "live" ? "live" : "test";

  return (
    <main className="bg-soft text-ink">
      <section className="tr-container tr-section">
        <p className="tr-eyebrow">Cart</p>
        <h1 className="tr-page-title mt-4">Your configured stands</h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-muted">
          Quantity duplicates the exact same configured stand. Use a separate product page setup when you need a different design, business name, or link.
        </p>
        <div className="mt-8">
          <CartTable stripeMode={stripeMode} />
        </div>
      </section>
    </main>
  );
}
