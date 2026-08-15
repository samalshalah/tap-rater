import { CartTable } from "@/components/cart/cart-table";
import { getStripeModeSafe } from "@/lib/checkout";

export const dynamic = "force-dynamic";

export default function CartPage() {
  const stripeMode = getStripeModeSafe() === "live" ? "live" : "test";

  return (
    <section className="mx-auto max-w-5xl px-4 py-12">
      <p className="text-sm font-semibold uppercase text-brand">Checkout</p>
      <h1 className="mt-3 text-4xl font-black text-ink">Your configured stands</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
        Quantity duplicates the exact same configured stand. Use a separate product page setup when you need a different design, business name, or link.
      </p>
      <div className="mt-8">
        <CartTable stripeMode={stripeMode} />
      </div>
    </section>
  );
}
