"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { AlertCircle, ArrowLeft, LockKeyhole } from "lucide-react";
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
  const standTotalCents = calculateCartTotalCents(items);
  const recurringTotalCents = calculateRecurringTotalCents(rows);
  const dueTodayCents = standTotalCents + recurringTotalCents;
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
    <div className="grid gap-5 lg:grid-cols-[minmax(300px,0.54fr)_minmax(420px,1.46fr)] lg:items-start">
      <aside className="tr-card p-4 sm:p-5">
        <div className="flex items-center gap-2 text-xs font-medium uppercase text-brand">
          <LockKeyhole size={16} />
          Secure checkout
        </div>

        <div className="mt-4">
          <p className="tr-eyebrow">Order summary</p>
          {rows.length > 0 ? (
            <div className="mt-3 grid gap-3">
              {rows.map((row) => (
                <div key={`${row.item.productId}-${row.option.id}-${row.item.setup?.destinationUrl ?? ""}`} className="rounded-md border border-line bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-5 text-ink">{row.product.title}</p>
                      <p className="mt-1 text-xs text-brand">{row.option.label}</p>
                    </div>
                    <p className="shrink-0 text-sm font-medium text-ink">{formatPrice(row.lineSubtotalCents)}</p>
                  </div>
                  <div className="mt-2 grid gap-1 text-xs leading-5 text-muted">
                    {row.item.setup?.businessName ? <p>Business: {row.item.setup.businessName}</p> : null}
                    {row.item.setup?.destinationUrl ? <p className="break-words">Destination: {row.item.setup.destinationUrl}</p> : null}
                    {row.item.setup?.serviceMode === "HOSTED" && row.item.setup?.serviceAddon === "hosted_multilink" ? (
                      <p>Multi-Link hosting: {formatPrice(row.item.setup.monthlyPriceCents ?? 0)}/mo</p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm leading-6 text-muted">
              Your configured order is ready for secure payment.
            </p>
          )}
        </div>

        <div className="mt-4 grid gap-2 border-y border-line py-4 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted">Stands</span>
            <span className="font-medium text-ink">{formatPrice(standTotalCents)}</span>
          </div>
          {recurringTotalCents > 0 ? (
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted">Multi-Link monthly</span>
              <span className="font-medium text-ink">{formatPrice(recurringTotalCents)}/mo</span>
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted">Shipping</span>
            <span className="text-right font-medium text-ink">Reviewed after payment</span>
          </div>
          <div className="flex items-center justify-between gap-4 pt-2 text-base">
            <span className="font-medium text-ink">Total before tax</span>
            <span className="font-medium text-ink">{formatPrice(dueTodayCents)}</span>
          </div>
        </div>

        <Link href="/cart" className="tr-button-outline mt-4 inline-flex items-center gap-2">
          <ArrowLeft size={16} />
          Back to cart
        </Link>
      </aside>

      <section className="tr-card min-h-[560px] p-3 sm:p-5">
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
        <p className="mt-2 text-sm leading-6 text-muted">Your cart details are still available if the session expired or was opened in another tab.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link href="/cart" className="tr-button-primary">
            Return to cart
          </Link>
          <Link href="/shop" className="tr-button-outline">
            Shop ready stands
          </Link>
        </div>
      </div>
    </div>
  );
}

function calculateRecurringTotalCents(rows: ReturnType<typeof getCartRows>) {
  return rows.reduce((sum, row) => {
    const hasHostedMultiLink = row.item.setup?.serviceMode === "HOSTED" && row.item.setup?.serviceAddon === "hosted_multilink";
    return sum + (hasHostedMultiLink ? (row.item.setup?.monthlyPriceCents ?? 0) * row.item.quantity : 0);
  }, 0);
}
