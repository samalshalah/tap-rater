import Link from "next/link";

type CheckoutSuccessPageProps = {
  searchParams?: Promise<{
    session_id?: string;
  }>;
};

export const metadata = {
  title: "Checkout Success | Tap Rater",
  description: "Your Tap Rater order was received."
};

export default async function CheckoutSuccessPage({ searchParams }: CheckoutSuccessPageProps) {
  const params = await searchParams;
  const sessionId = typeof params?.session_id === "string" ? params.session_id : "";

  return (
    <main className="min-h-screen bg-[#f7f8fa] px-4 py-16 text-ink">
      <section className="mx-auto max-w-2xl rounded-[22px] border border-line bg-white p-7 shadow-sm sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-brand">Order received</p>
        <h1 className="mt-3 text-4xl font-extrabold leading-tight text-ink">Your order was received</h1>
        <p className="mt-4 leading-7 text-muted">
          Stripe is finalizing the payment confirmation. Tap Rater will review your stand setup and fulfillment details
          before production starts.
        </p>
        <p className="mt-3 leading-7 text-muted">
          Standard Direct stands use NFC only with no printed QR. Branded + QR stands include the uploaded logo,
          business name, generated QR, and proof confirmation for production review.
        </p>
        {sessionId ? (
          <p className="mt-4 rounded-md bg-gray-50 p-3 text-sm text-muted">
            Need help with this order? Contact support and include the checkout reference from your payment confirmation.
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/shop" className="inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-sm font-black text-white hover:bg-brand">
            Continue shopping
          </Link>
          <Link href="/support" className="inline-flex min-h-11 items-center rounded-full border border-line px-5 text-sm font-black text-ink hover:border-ink">
            Contact support
          </Link>
        </div>
      </section>
    </main>
  );
}
