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
    <main className="min-h-screen bg-gray-50 px-4 py-16">
      <section className="mx-auto max-w-2xl rounded-md border border-line bg-white p-8 shadow-sm">
        <p className="text-sm font-black uppercase text-brand">Order received</p>
        <h1 className="mt-3 text-4xl font-black text-ink">Your order was received</h1>
        <p className="mt-4 leading-7 text-muted">
          Your order was received. We will contact you for logo/design confirmation before printing when your selected
          stand requires branding or custom artwork. Standard direct stands move to fulfillment after payment and setup
          details are confirmed.
        </p>
        <p className="mt-3 leading-7 text-muted">
          Stripe marks the order paid only after the webhook confirms the checkout session.
        </p>
        {sessionId ? (
          <p className="mt-4 rounded-md bg-gray-50 p-3 text-sm font-semibold text-muted">Session: {sessionId}</p>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/shop" className="rounded-md bg-brand px-5 py-3 text-sm font-bold text-white">
            Continue shopping
          </Link>
          <Link href="/account/login" className="rounded-md border border-line px-5 py-3 text-sm font-bold text-ink">
            Customer account
          </Link>
        </div>
      </section>
    </main>
  );
}
