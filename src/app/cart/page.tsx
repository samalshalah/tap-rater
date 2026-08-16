import { CartTable } from "@/components/cart/cart-table";
import { getStripeModeSafe } from "@/lib/checkout";

export const dynamic = "force-dynamic";

export default function CartPage() {
  const stripeMode = getStripeModeSafe() === "live" ? "live" : "test";

  return (
    <main className="bg-[#f7f8fa] text-ink">
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-brand">Cart</p>
        <h1 className="mt-4 text-4xl font-extrabold leading-tight text-ink md:text-5xl">Your configured stands</h1>
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
