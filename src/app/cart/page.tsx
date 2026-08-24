import { CartTable } from "@/components/cart/cart-table";
import { getStripeModeSafe } from "@/lib/checkout";

export const dynamic = "force-dynamic";

export default function CartPage() {
  const stripeMode = getStripeModeSafe() === "live" ? "live" : "test";

  return (
    <main className="bg-white text-ink">
      <section className="tr-container py-12 lg:py-16">
        <p className="tr-eyebrow">Cart</p>
        <h1 className="mt-4 max-w-4xl text-[2.45rem] font-semibold leading-[1.06] text-[#111317] sm:text-[3.25rem]">Your configured stands</h1>
        <p className="mt-5 max-w-3xl text-lg font-medium leading-8 text-[#5f686f]">
          Quantity duplicates the exact same configured stand. Use a separate product page setup when you need a different design, business name, or link.
        </p>
        <div className="mt-10 rounded-[28px] border border-line bg-[#f7f8f8] p-4 sm:p-6">
          <CartTable stripeMode={stripeMode} />
        </div>
      </section>
    </main>
  );
}
