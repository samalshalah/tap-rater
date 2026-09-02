import Link from "next/link";
import { PageHero, SectionShell } from "@/components/storefront/section";
import { formatOrderReference } from "@/lib/order-reference";

type CheckoutSuccessPageProps = {
  searchParams?: Promise<{
    session_id?: string;
    manual_order?: string;
  }>;
};

export const metadata = {
  title: "Checkout Success | Tap Rater",
  description: "Your Tap Rater order was received."
};

export default async function CheckoutSuccessPage({ searchParams }: CheckoutSuccessPageProps) {
  const params = await searchParams;
  const sessionId = typeof params?.session_id === "string" ? params.session_id : "";
  const manualOrderReference = typeof params?.manual_order === "string" ? params.manual_order : "";
  const isManualOrder = Boolean(manualOrderReference);

  return (
    <main className="tr-public-shell text-ink">
      <PageHero
        eyebrow="Order received"
        title="Your order was received"
        body={isManualOrder
          ? "Tap Rater will review your stand setup and contact you with the next step for payment and fulfillment."
          : "Stripe is finalizing the payment confirmation. Tap Rater will review your stand setup and fulfillment details before fulfillment starts."}
      />
      <SectionShell tone="soft" spacing="compact">
        <div className="tr-container-narrow">
      <section className="tr-card p-6 sm:p-7">
        <p className="mt-4 leading-7 text-muted">
          Standard Direct stands use NFC pointed directly to the destination URL approved during setup.
          Tap Rater reviews the order before fulfillment.
        </p>
        {manualOrderReference ? (
          <p className="mt-4 rounded-md bg-gray-50 p-3 text-sm text-muted">
            Order number: <span className="font-medium text-ink">{formatOrderReference(manualOrderReference)}</span>
          </p>
        ) : sessionId ? (
          <p className="mt-4 rounded-md bg-gray-50 p-3 text-sm text-muted">
            Need help with this order? Contact support and include the checkout reference from your payment confirmation.
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/shop" className="inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-brand">
            Continue shopping
          </Link>
          <Link href="/support" className="inline-flex min-h-11 items-center rounded-full border border-line px-5 text-sm font-semibold text-ink hover:border-ink">
            Contact support
          </Link>
        </div>
      </section>
        </div>
      </SectionShell>
    </main>
  );
}
