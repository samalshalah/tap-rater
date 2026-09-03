"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { AlertCircle, ArrowLeft, LockKeyhole } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { calculateCartTotalCents, getCartRows } from "@/lib/cart";
import { formatPrice } from "@/lib/products";
import { resolveCheckoutShippingRule } from "@/lib/shipping-rules";
import type { StripePublicConfig } from "@/lib/stripe-public-config";

type EmbeddedCheckoutSession = {
  clientSecret: string;
  sessionId: string;
  createdAt?: number;
};

type CustomerForm = {
  email: string;
  name: string;
  phone: string;
  createAccount: boolean;
};

type ShippingForm = {
  name: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: "US";
  phone: string;
};

const emptyCustomer: CustomerForm = {
  email: "",
  name: "",
  phone: "",
  createAccount: false
};

const emptyShipping: ShippingForm = {
  name: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "US",
  phone: ""
};

export function EmbeddedCheckoutClient({ stripePublicConfig }: { stripePublicConfig: StripePublicConfig }) {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id") ?? "";
  const { items } = useCart();
  const rows = getCartRows(items);
  const standTotalCents = calculateCartTotalCents(items);
  const recurringTotalCents = calculateRecurringTotalCents(rows);
  const shippingRule = resolveCheckoutShippingRule(standTotalCents);
  const dueTodayCents = standTotalCents + recurringTotalCents + shippingRule.amountCents;
  const hasHostedMultiLink = rows.some((row) => row.item.setup?.serviceMode === "HOSTED" && row.item.setup?.serviceAddon === "hosted_multilink");
  const [customer, setCustomer] = useState<CustomerForm>(emptyCustomer);
  const [shipping, setShipping] = useState<ShippingForm>(emptyShipping);
  const [session, setSession] = useState<EmbeddedCheckoutSession | null>(null);
  const [error, setError] = useState("");
  const [isStartingPayment, setIsStartingPayment] = useState(false);
  const [step, setStep] = useState<"details" | "payment">(sessionId ? "payment" : "details");
  const publishableKey = stripePublicConfig.ok ? stripePublicConfig.publishableKey : "";
  const stripePromise = useMemo(() => (publishableKey ? loadStripe(publishableKey) : null), [publishableKey]);

  useEffect(() => {
    let active = true;
    fetch("/api/account/session", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => {
        if (!active || body?.authenticated !== true || typeof body.email !== "string") return;
        const name = typeof body.name === "string" ? body.name : typeof body.businessName === "string" ? body.businessName : "";
        setCustomer((current) => ({
          ...current,
          email: body.email,
          name: current.name || name,
          createAccount: hasHostedMultiLink || current.createAccount
        }));
        setShipping((current) => ({
          ...current,
          name: current.name || name
        }));
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, [hasHostedMultiLink]);

  useEffect(() => {
    if (!hasHostedMultiLink) return;
    setCustomer((current) => ({ ...current, createAccount: true }));
  }, [hasHostedMultiLink]);

  useEffect(() => {
    if (!sessionId) return;
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
        setStep("payment");
        return;
      }
    } catch {
      // Fall through to the clear error below.
    }

    setError("Checkout session could not be loaded. Please return to your cart and start checkout again.");
  }, [sessionId]);

  const options = useMemo(() => (session?.clientSecret ? { clientSecret: session.clientSecret } : undefined), [session?.clientSecret]);

  async function startPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsStartingPayment(true);
    setError("");

    if (!stripePublicConfig.ok) {
      setError(stripePublicConfig.error);
      setIsStartingPayment(false);
      return;
    }

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          customer: {
            ...customer,
            createAccount: hasHostedMultiLink || customer.createAccount
          },
          shippingAddress: {
            ...shipping,
            name: shipping.name || customer.name,
            phone: shipping.phone || customer.phone
          }
        })
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok || body.checkoutMode !== "embedded" || typeof body.clientSecret !== "string" || typeof body.sessionId !== "string") {
        setError(body.error ?? "Stripe Checkout is not available yet.");
        return;
      }

      const nextSession = {
        clientSecret: body.clientSecret,
        sessionId: body.sessionId,
        createdAt: Date.now()
      };
      window.sessionStorage.setItem(`taprater:embedded-checkout:${body.sessionId}`, JSON.stringify(nextSession));
      window.history.replaceState(null, "", `/checkout?session_id=${encodeURIComponent(body.sessionId)}`);
      setSession(nextSession);
      setStep("payment");
    } catch {
      setError("Stripe Checkout is not available yet.");
    } finally {
      setIsStartingPayment(false);
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-[1120px] gap-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium uppercase text-brand">
            <LockKeyhole size={16} />
            Secure checkout
          </div>
          <h1 className="mt-1 text-2xl font-medium leading-tight text-ink">{step === "payment" ? "Payment" : "Shipping details"}</h1>
        </div>
        <Link href="/cart" className="tr-button-outline inline-flex items-center gap-2">
          <ArrowLeft size={16} />
          Back to cart
        </Link>
      </header>

      <div className="grid gap-5 lg:grid-cols-[390px_minmax(0,1fr)] lg:items-start">
        <CheckoutSummary
          dueTodayCents={dueTodayCents}
          recurringTotalCents={recurringTotalCents}
          rows={rows}
          shippingAmountCents={shippingRule.amountCents}
          standTotalCents={standTotalCents}
        />

        <section className="tr-card min-h-[520px] p-4 sm:p-5">
          {step === "details" ? (
            <form className="grid gap-4" onSubmit={startPayment}>
              <div>
                <p className="tr-eyebrow">Customer</p>
                <h2 className="mt-1 text-xl font-medium text-ink">Contact and shipping</h2>
                <p className="mt-1 text-sm leading-6 text-muted">Payment comes next. Multi-Link orders include account setup automatically.</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <CheckoutInput label="Email" type="email" value={customer.email} autoComplete="email" onChange={(value) => setCustomer((current) => ({ ...current, email: value }))} required />
                <CheckoutInput label="Customer name" value={customer.name} autoComplete="name" onChange={(value) => {
                  setCustomer((current) => ({ ...current, name: value }));
                  setShipping((current) => ({ ...current, name: current.name || value }));
                }} required />
                <CheckoutInput label="Phone" type="tel" value={customer.phone} autoComplete="tel" onChange={(value) => setCustomer((current) => ({ ...current, phone: value }))} />
                <CheckoutInput label="Ship to name" value={shipping.name} autoComplete="shipping name" onChange={(value) => setShipping((current) => ({ ...current, name: value }))} required />
              </div>

              <div className="grid gap-3">
                <CheckoutInput label="Address" value={shipping.line1} autoComplete="shipping address-line1" onChange={(value) => setShipping((current) => ({ ...current, line1: value }))} required />
                <CheckoutInput label="Apartment, suite, unit" value={shipping.line2} autoComplete="shipping address-line2" onChange={(value) => setShipping((current) => ({ ...current, line2: value }))} />
                <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_110px_130px]">
                  <CheckoutInput label="City" value={shipping.city} autoComplete="shipping address-level2" onChange={(value) => setShipping((current) => ({ ...current, city: value }))} required />
                  <CheckoutInput label="State" value={shipping.state} autoComplete="shipping address-level1" onChange={(value) => setShipping((current) => ({ ...current, state: value.toUpperCase().slice(0, 2) }))} required />
                  <CheckoutInput label="ZIP code" value={shipping.postalCode} autoComplete="shipping postal-code" onChange={(value) => setShipping((current) => ({ ...current, postalCode: value }))} required />
                </div>
              </div>

              <label className="flex items-start gap-3 rounded-md border border-line bg-soft p-3 text-sm text-ink">
                <input
                  type="checkbox"
                  checked={hasHostedMultiLink || customer.createAccount}
                  disabled={hasHostedMultiLink}
                  onChange={(event) => setCustomer((current) => ({ ...current, createAccount: event.target.checked }))}
                  className="mt-1 h-4 w-4 accent-brand"
                />
                <span>
                  <span className="block font-medium">{hasHostedMultiLink ? "Account included for Multi-Link" : "Create an account for order access"}</span>
                  <span className="mt-1 block text-xs leading-5 text-muted">
                    {hasHostedMultiLink
                      ? "After payment, the customer receives an activation email to set a password and manage the Multi-Link page."
                      : "Optional. The customer can track orders and access billing after payment."}
                  </span>
                </span>
              </label>

              {error ? <p className="tr-status-warning" role="alert">{error}</p> : null}

              <button type="submit" disabled={isStartingPayment || rows.length === 0} className="tr-button-primary min-h-12 w-full">
                {isStartingPayment ? "Preparing payment..." : "Continue to payment"}
              </button>
            </form>
          ) : !stripePublicConfig.ok ? (
            <CheckoutError message={stripePublicConfig.error} />
          ) : !stripePromise ? (
            <CheckoutError message="Stripe could not be loaded." />
          ) : error ? (
            <CheckoutError message={error} />
          ) : session && options ? (
            <div className="grid gap-3">
              <div>
                <p className="tr-eyebrow">Payment</p>
                <h2 className="mt-1 text-xl font-medium text-ink">Pay securely</h2>
              </div>
              <EmbeddedCheckoutProvider stripe={stripePromise} options={options}>
                <EmbeddedCheckout />
              </EmbeddedCheckoutProvider>
            </div>
          ) : (
            <div className="grid min-h-[480px] place-items-center text-sm font-medium text-muted">Loading secure checkout...</div>
          )}
        </section>
      </div>
    </div>
  );
}

function CheckoutSummary({
  dueTodayCents,
  recurringTotalCents,
  rows,
  shippingAmountCents,
  standTotalCents
}: {
  dueTodayCents: number;
  recurringTotalCents: number;
  rows: ReturnType<typeof getCartRows>;
  shippingAmountCents: number;
  standTotalCents: number;
}) {
  return (
    <aside className="tr-card p-4 sm:p-5 lg:sticky lg:top-24">
      <p className="tr-eyebrow">Order summary</p>
      <div className="mt-3 grid gap-3">
        {rows.length > 0 ? (
          rows.map((row) => (
            <div key={`${row.item.productId}-${row.option.id}-${row.item.setup?.destinationUrl ?? row.item.setup?.serviceAddon ?? ""}`} className="rounded-md border border-line bg-white p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-5 text-ink">{row.product.title}</p>
                  <p className="mt-1 text-xs text-brand">{row.option.label}</p>
                </div>
                <p className="text-sm font-medium text-ink">{formatPrice(row.lineSubtotalCents)}</p>
              </div>
              {row.item.setup?.businessName ? <p className="mt-2 truncate text-xs text-muted">Business: {row.item.setup.businessName}</p> : null}
              {row.item.setup?.serviceMode === "HOSTED" && row.item.setup?.serviceAddon === "hosted_multilink" ? (
                <p className="mt-1 text-xs text-muted">Multi-Link: {formatPrice(row.item.setup.monthlyPriceCents ?? 0)}/mo</p>
              ) : null}
            </div>
          ))
        ) : (
          <p className="text-sm leading-6 text-muted">Your cart is empty. Return to cart before checkout.</p>
        )}
      </div>

      <div className="mt-4 grid gap-2 border-t border-line pt-4 text-sm">
        <SummaryRow label="Stands" value={formatPrice(standTotalCents)} />
        {recurringTotalCents > 0 ? <SummaryRow label="Monthly" value={`${formatPrice(recurringTotalCents)}/mo`} /> : null}
        <SummaryRow label="Shipping" value={shippingAmountCents > 0 ? formatPrice(shippingAmountCents) : "Free"} />
        <SummaryRow label="Total before tax" value={formatPrice(dueTodayCents)} strong />
      </div>
    </aside>
  );
}

function SummaryRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-4 ${strong ? "pt-2 text-base" : ""}`}>
      <span className={strong ? "font-medium text-ink" : "text-muted"}>{label}</span>
      <span className={strong ? "font-medium text-ink" : "text-ink"}>{value}</span>
    </div>
  );
}

function CheckoutInput({
  autoComplete,
  label,
  onChange,
  required = false,
  type = "text",
  value
}: {
  autoComplete?: string;
  label: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
  value: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-medium text-ink">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        required={required}
        className="min-h-11 rounded-md border border-line bg-white px-3 text-sm font-normal text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
      />
    </label>
  );
}

function CheckoutError({ message }: { message: string }) {
  return (
    <div className="grid min-h-[420px] place-items-center p-6 text-center">
      <div>
        <AlertCircle className="mx-auto text-amber-600" size={34} />
        <p className="mt-4 font-medium text-ink">{message}</p>
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
