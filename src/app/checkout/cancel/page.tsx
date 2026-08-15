import Link from "next/link";

export const metadata = {
  title: "Checkout Canceled | Tap Rater",
  description: "Your Tap Rater Stripe checkout was canceled."
};

export default function CheckoutCancelPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-16">
      <section className="mx-auto max-w-2xl rounded-md border border-line bg-white p-8 shadow-sm">
        <p className="text-sm font-black uppercase text-brand">Stripe checkout</p>
        <h1 className="mt-3 text-4xl font-black text-ink">Checkout canceled</h1>
        <p className="mt-4 leading-7 text-muted">
          No payment was completed. Your cart stays in the browser so you can adjust quantities or try checkout again.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/cart" className="rounded-md bg-brand px-5 py-3 text-sm font-bold text-white">
            Return to cart
          </Link>
          <Link href="/shop" className="rounded-md border border-line px-5 py-3 text-sm font-bold text-ink">
            Shop products
          </Link>
        </div>
      </section>
    </main>
  );
}
