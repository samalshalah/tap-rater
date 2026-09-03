import Link from "next/link";
import { PageHero, SectionShell } from "@/components/storefront/section";
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";
import { formatOrderReference } from "@/lib/order-reference";
import { formatPrice } from "@/lib/products";

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
  const order = sessionId ? await loadCheckoutSuccessOrder(sessionId) : null;
  const reference = manualOrderReference || order?.reference || "";
  const accountRequested = order?.accountRequested === true;
  const hasInvoice = Boolean(order?.invoiceUrl || order?.receiptUrl);

  return (
    <main className="tr-public-shell text-ink">
      <PageHero
        eyebrow="Order received"
        title="Your order was received"
        body={isManualOrder
          ? "Tap Rater will review your stand setup and contact you with the next step for payment and fulfillment."
          : "Payment was submitted securely. Your order details, invoice, and receipt will be connected to your account after Stripe confirms the payment."}
      />
      <SectionShell tone="soft" spacing="compact">
        <div className="tr-container-narrow">
      <section className="tr-card p-6 sm:p-7">
        <div className="grid gap-3 text-sm text-muted">
          {reference ? (
            <p className="rounded-md bg-gray-50 p-3">
              Order number: <span className="font-medium text-ink">{formatOrderReference(reference)}</span>
              {order?.totalCents ? <span> · Total: {formatPrice(order.totalCents)}</span> : null}
            </p>
          ) : null}
          <p>
            {hasInvoice
              ? "Your invoice and receipt are available in your account billing area."
              : "Your invoice and receipt will appear in your account after Stripe sends the payment confirmation webhook."}
          </p>
          {accountRequested ? (
            <p>Check your email for the activation link to set your Tap Rater account password.</p>
          ) : null}
          <p>Need help with this order? Contact support and include your order number.</p>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/account/orders" className="inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-sm font-semibold text-white hover:bg-brand">
            View orders and invoices
          </Link>
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

async function loadCheckoutSuccessOrder(sessionId: string) {
  if (!hasSupabaseAdminConfig()) return null;

  try {
    const { data } = await getSupabaseAdmin()
      .from("orders")
      .select("stripe_checkout_session_id,total_cents,customer_details_json")
      .eq("stripe_checkout_session_id", sessionId)
      .maybeSingle();
    const row = data && typeof data === "object" ? data as Record<string, unknown> : null;
    if (!row) return null;
    const details = row.customer_details_json && typeof row.customer_details_json === "object" ? row.customer_details_json as Record<string, unknown> : {};
    return {
      reference: readString(row.stripe_checkout_session_id),
      totalCents: typeof row.total_cents === "number" ? row.total_cents : 0,
      accountRequested: details.create_account === true,
      invoiceUrl: readString(details.invoice_pdf_url) ?? readString(details.hosted_invoice_url),
      receiptUrl: readString(details.receipt_url)
    };
  } catch {
    return null;
  }
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : undefined;
}
