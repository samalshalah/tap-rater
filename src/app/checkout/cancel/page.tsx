import Link from "next/link";

export const metadata = {
  title: "Checkout Canceled | Tap Rater",
  description: "Your Tap Rater Stripe checkout was canceled."
};

export default function CheckoutCancelPage() {
  return (
    <main className="min-h-screen bg-[#f7f8fa] px-4 py-16 text-ink">
      <section className="mx-auto max-w-2xl rounded-[22px] border border-line bg-white p-7 shadow-sm sm:p-8">
        <p className="tr-eyebrow">Stripe checkout</p>
        <h1 className="tr-page-title mt-3">Checkout canceled</h1>
        <p className="mt-4 leading-7 text-muted">
          No payment was completed. Your cart stays in the browser so you can adjust quantities or try checkout again.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/cart" className="inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-brand">
            Return to cart
          </Link>
          <Link href="/shop" className="inline-flex min-h-11 items-center rounded-full border border-line px-5 text-sm font-semibold text-ink hover:border-ink">
            Shop products
          </Link>
        </div>
      </section>
    </main>
  );
}
