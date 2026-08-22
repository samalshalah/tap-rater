"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { AlertCircle, LockKeyhole } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { calculateCartTotalCents, getCartRows } from "@/lib/cart";
import { formatPrice } from "@/lib/products";
import type { StripePublicConfig } from "@/lib/stripe-public-config";

type EmbeddedCheckoutSession = {
  clientSecret: string;
  sessionId: string;
  createdAt?: number;
};

export function EmbeddedCheckoutClient({ stripePublicConfig }: { stripePublicConfig: StripePublicConfig }) {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id") ?? "";
  const { items } = useCart();
  const rows = getCartRows(items);
  const totalCents = calculateCartTotalCents(items);
  const [session, setSession] = useState<EmbeddedCheckoutSession | null>(null);
  const [error, setError] = useState("");
  const publishableKey = stripePublicConfig.ok ? stripePublicConfig.publishableKey : "";
  const stripePromise = useMemo(() => (publishableKey ? loadStripe(publishableKey) : null), [publishableKey]);

  useEffect(() => {
    if (!sessionId) {
      setError("Checkout session is missing. Please return to your cart and start checkout again.");
      return;
    }

    const stored = window.sessionStorage.getItem(`taprater:embedded-checkout:${sessionId}`);

    if (!stored) {
      setError("Checkout session expired or was opened in a different browser tab. Please return to your cart and start checkout again.");
      return;
    }

    try {
      const parsed = JSON.parse(stored) as Partial<EmbeddedCheckoutSession>;
      if (parsed.sessionId === sessionId && typeof parsed.clientSecret === "string" && parsed.clientSecret) {
        setSession({
          clientSecret: parsed.clientSecret,
          sessionId,
          createdAt: typeof parsed.createdAt === "number" ? parsed.createdAt : undefined
        });
        setError("");
        return;
      }
    } catch {
      // Fall through to the clear error below.
    }

    setError("Checkout session could not be loaded. Please return to your cart and start checkout again.");
  }, [sessionId]);

  const options = useMemo(() => (session?.clientSecret ? { clientSecret: session.clientSecret } : undefined), [session?.clientSecret]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.86fr)_minmax(360px,1.14fr)] lg:items-start">
      <aside className="rounded-[22px] border border-line bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-brand">
          <LockKeyhole size={16} />
          Secure Stripe checkout
        </div>
        <h1 className="mt-3 text-3xl font-extrabold leading-tight text-ink">Checkout inside Tap Rater</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          Payment is processed securely by Stripe. Tap Rater prepares the order after Stripe confirms payment through the webhook.
        </p>

        <div className="mt-6 rounded-2xl border border-line bg-[#f7f8fa] p-4">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-muted">Order summary</p>
          {rows.length > 0 ? (
            <div className="mt-4 grid gap-4">
              {rows.map((row) => (
                <div key={`${row.item.productId}-${row.option.id}-${row.item.setup?.destinationUrl ?? ""}`} className="border-b border-line pb-4 last:border-b-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-ink">{row.product.title}</p>
                      <p className="mt-1 text-xs font-black uppercase tracking-[0.08em] text-brand">{row.option.label}</p>
                    </div>
                    <p className="font-black text-ink">{formatPrice(row.lineSubtotalCents)}</p>
                  </div>
                  <div className="mt-2 grid gap-1 text-xs leading-5 text-muted">
                    {row.item.setup?.destinationUrl ? <p>Destination: {row.item.setup.destinationUrl}</p> : null}
                    <p>{row.option.hasQr ? "NFC + printed QR" : "NFC only, no printed QR"}</p>
                    {row.item.setup?.businessName ? <p>Business: {row.item.setup.businessName}</p> : null}
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between pt-1 text-lg font-black text-ink">
                <span>Total before tax</span>
                <span>{formatPrice(totalCents)}</span>
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-muted">
              Your configured order was sent to Stripe. Return to the cart if you need to review or change the setup details.
            </p>
          )}
        </div>

        <p className="mt-5 text-xs leading-5 text-muted">
          Manual shipping mode is active. Stripe collects the shipping address, and no shipping fee is added by Tap Rater in manual mode.
        </p>
        <Link href="/cart" className="mt-5 inline-flex min-h-11 items-center rounded-full border border-line px-5 text-sm font-black text-ink hover:border-ink">
          Back to cart
        </Link>
      </aside>

      <section className="min-h-[560px] rounded-[22px] border border-line bg-white p-3 shadow-sm sm:p-5">
        {!stripePublicConfig.ok ? (
          <CheckoutError message={stripePublicConfig.error} />
        ) : !stripePromise ? (
          <CheckoutError message="Stripe could not be loaded." />
        ) : error ? (
          <CheckoutError message={error} />
        ) : session && options ? (
          <EmbeddedCheckoutProvider stripe={stripePromise} options={options}>
            <EmbeddedCheckout />
          </EmbeddedCheckoutProvider>
        ) : (
          <div className="grid min-h-[480px] place-items-center text-sm font-semibold text-muted">Loading secure checkout...</div>
        )}
      </section>
    </div>
  );
}

function CheckoutError({ message }: { message: string }) {
  return (
    <div className="grid min-h-[480px] place-items-center p-6 text-center">
      <div>
        <AlertCircle className="mx-auto text-amber-600" size={34} />
        <p className="mt-4 font-black text-ink">{message}</p>
        <Link href="/cart" className="mt-5 inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-sm font-black text-white hover:bg-brand">
          Return to cart
        </Link>
      </div>
    </div>
  );
}
