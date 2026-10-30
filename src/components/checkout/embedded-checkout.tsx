"use client";
import dynamic from 'next/dynamic';
import {CheckoutSummary} from './checkout-summary';
import {CheckoutError} from './checkout-fields';

import Link from "next/link";
import {marketingAmount,type MarketingPurchase} from '@/lib/marketing-plan';
import { quoteOffers, offerShippingSettings, type OffersSettings } from "@/lib/offers";
import type { ShippingSettingsInput } from "@/lib/validators";

import { useAnalytics } from "@/components/analytics/analytics-provider";
import {
  checkoutAnalyticsHeaders,
  trackCheckoutStep,
} from "@/lib/analytics-browser";
import { useSearchParams } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useCart } from "@/components/cart/cart-provider";
import { getCartRows } from "@/lib/cart";
import { resolveCheckoutShippingRule } from "@/lib/shipping-rules";
import {
  getCheckoutTaxableAmountCents,
  getCheckoutTaxAmountCents,
} from "@/lib/tax-rules";
import type { StripePublicConfig } from "@/lib/stripe-public-config";

import type { TaxSettingsInput } from "@/lib/validators";

const StripePaymentPanel = dynamic(() => import('./stripe-payment-panel').then(m => m.StripePaymentPanel), {
  loading: () => <div role="status" className="grid min-h-[360px] place-items-center text-sm font-medium text-muted">Loading secure payment...</div>,
});

import {CheckoutDetailsForm} from './checkout-details-form';
import type {CustomerForm,ShippingForm} from './checkout-details-types';

type EmbeddedCheckoutSession = {
  clientSecret: string;
  sessionId: string;
  createdAt?: number;
};

const emptyCustomer: CustomerForm = {
  email: "",
  name: "",
  phone: "",
  createAccount: false,
};

const emptyShipping: ShippingForm = {
  name: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "US",
  phone: "",
};

export function EmbeddedCheckoutClient({
  marketingAvailable=false,
  offers, shippingSettings,
  stripePublicConfig,
  taxSettings,
}: {
  marketingAvailable?:boolean;
  offers: OffersSettings; shippingSettings: ShippingSettingsInput;
  stripePublicConfig: StripePublicConfig;
  taxSettings: TaxSettingsInput;
}) {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id") ?? "";
  const { items } = useCart();
  const [reminderConsent, setReminderConsent] = useState(false);
  const [marketing,setMarketing]=useState<MarketingPurchase|undefined>();
  const [customer, setCustomer] = useState<CustomerForm>(emptyCustomer);
  const [shipping, setShipping] = useState<ShippingForm>(emptyShipping);
  const [differentRecipient, setDifferentRecipient] = useState(false);
  const rows = useMemo(() => getCartRows(items), [items]);
  const promotion = useMemo(() => quoteOffers(rows.map(r => ({ productId: r.item.productId, optionId: r.option.id, quantity: r.item.quantity, unitAmountCents: r.unitPriceCents, recurring: r.option.requiresSubscription || r.item.setup?.serviceMode === "HOSTED" })), offers), [rows, offers]);
  const standTotalCents = promotion.subtotalCents;
  const recurringTotalCents = useMemo(() => calculateRecurringTotalCents(rows), [rows]);
  const shippingRule = useMemo(() => resolveCheckoutShippingRule(standTotalCents, offerShippingSettings(shippingSettings, offers, shipping.country)), [standTotalCents, shippingSettings, offers, shipping.country]);
  const taxAmountCents = useMemo(() => getCheckoutTaxAmountCents(
    taxSettings,
    getCheckoutTaxableAmountCents({
      recurringTotalCents,
      shippingState: shipping.state,
      shippingAmountCents: shippingRule.amountCents,
      standTotalCents,
      taxSettings,
    }),
  ), [taxSettings, recurringTotalCents, shipping.state, shippingRule.amountCents, standTotalCents]);
  const dueTodayCents =
    standTotalCents +
    recurringTotalCents +
    shippingRule.amountCents +
    taxAmountCents+(marketing?marketingAmount(marketing):0);
  const hasHostedMultiLink = rows.some(
    (row) =>
      row.item.setup?.serviceMode === "HOSTED" &&
      row.item.setup?.serviceAddon === "hosted_multilink",
  );
  const [session, setSession] = useState<EmbeddedCheckoutSession | null>(null);
  const [error, setError] = useState("");
  const [isStartingPayment, setIsStartingPayment] = useState(false);
  const [isFillingAddress, setIsFillingAddress] = useState(false);
  const [step, setStep] = useState<"details" | "payment">(
    sessionId ? "payment" : "details",
  );
  const checkoutAttemptId = useRef("");
  const { ready: analyticsReady } = useAnalytics();
  const trackedPaymentSession = useRef<string | null>(null);
  useEffect(() => {
    if (
      analyticsReady &&
      step === "payment" &&
      session?.sessionId &&
      trackedPaymentSession.current !== session.sessionId
    ) {
      trackCheckoutStep("payment_step");
      trackedPaymentSession.current = session.sessionId;
    }
  }, [analyticsReady, step, session?.sessionId]);
  const publishableKey = stripePublicConfig.ok
    ? stripePublicConfig.publishableKey
    : "";
  const stripePromise = useMemo(
    () => (publishableKey ? loadStripe(publishableKey) : null),
    [publishableKey],
  );

  useEffect(() => {
    let active = true;
    fetch("/api/account/session", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => {
        if (
          !active ||
          body?.authenticated !== true ||
          typeof body.email !== "string"
        )
          return;
        const name =
          typeof body.name === "string"
            ? body.name
            : typeof body.businessName === "string"
              ? body.businessName
              : "";
        setCustomer((current) => ({
          ...current,
          email: body.email,
          name: current.name || name,
          createAccount: hasHostedMultiLink || current.createAccount,
        }));
        setShipping((current) => ({
          ...current,
          name: current.name || name,
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
    const stored = window.sessionStorage.getItem(
      `taprater:embedded-checkout:${sessionId}`,
    );

    if (!stored) {
      setError(
        "Checkout session expired or was opened in a different browser tab. Please return to your cart and start checkout again.",
      );
      return;
    }

    try {
      const parsed = JSON.parse(stored) as Partial<EmbeddedCheckoutSession>;
      if (
        parsed.sessionId === sessionId &&
        typeof parsed.clientSecret === "string" &&
        parsed.clientSecret
      ) {
        setSession({
          clientSecret: parsed.clientSecret,
          sessionId,
          createdAt:
            typeof parsed.createdAt === "number" ? parsed.createdAt : undefined,
        });
        setError("");
        setStep("payment");
        return;
      }
    } catch {
      // Fall through to the clear error below.
    }

    setError(
      "Checkout session could not be loaded. Please return to your cart and start checkout again.",
    );
  }, [sessionId]);

  useEffect(() => {
    if (!session?.sessionId || !reminderConsent) return;
    const touch = () => { if (document.visibilityState === "visible") fetch("/api/checkout/activity", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sessionId: session.sessionId }),
    }).catch(() => {}); };
    const timer = window.setInterval(touch, 60000);
    return () => window.clearInterval(timer);
  }, [session?.sessionId, reminderConsent]);

  const options = useMemo(() => {
    if (!session?.clientSecret) return undefined;

    return {
      clientSecret: session.clientSecret,
      defaultValues: {
        phoneNumber: customer.phone || shipping.phone || undefined,
        shippingAddress: {
          name: shipping.name || customer.name,
          address: {
            line1: shipping.line1,
            line2: shipping.line2 || undefined,
            city: shipping.city,
            state: shipping.state,
            postal_code: shipping.postalCode,
            country: shipping.country,
          },
        },
        billingAddress: {
          name: customer.name,
          address: {
            line1: shipping.line1,
            line2: shipping.line2 || undefined,
            city: shipping.city,
            state: shipping.state,
            postal_code: shipping.postalCode,
            country: shipping.country,
          },
        },
      },
      elementsOptions: {
        appearance: {
          theme: "stripe" as const,
          variables: {
            borderRadius: "8px",
            colorPrimary: "#0f766e",
            colorText: "#111827",
            colorTextSecondary: "#596879",
            fontFamily: "Inter, system-ui, sans-serif",
          },
        },
      },
    };
  }, [customer.name, customer.phone, session?.clientSecret, shipping]);

  async function startPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isFillingAddress || isStartingPayment) return;
    setIsStartingPayment(true);
    setError("");

    if (!stripePublicConfig.ok) {
      setError(stripePublicConfig.error);
      setIsStartingPayment(false);
      return;
    }

    try {
      if (!checkoutAttemptId.current) {
        const reservations = items
          .flatMap((item) =>
            item.setup?.hostedReservationId
              ? [item.setup.hostedReservationId]
              : [],
          )
          .sort();
        const attemptKey = reservations.length
          ? `taprater:branded-checkout-attempt:${reservations.join(":")}:${marketing ? `${marketing.cadence}:${marketing.locations}` : 'stand-only'}`
          : undefined;
        checkoutAttemptId.current =
          (attemptKey ? window.sessionStorage.getItem(attemptKey) : null) ||
          createCheckoutAttemptId();
        if (attemptKey)
          window.sessionStorage.setItem(attemptKey, checkoutAttemptId.current);
      }

      trackCheckoutStep("add_shipping_info");
      const analyticsHeaders = await checkoutAnalyticsHeaders();
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...analyticsHeaders },
        body: JSON.stringify({
          marketing,
          reminderConsent,
          checkoutAttemptId: checkoutAttemptId.current,
          quotedTotalCents: dueTodayCents,
          items,
          customer: {
            ...customer,
            createAccount: hasHostedMultiLink || customer.createAccount,
          },
          shippingAddress: {
            ...shipping,
            name: shipping.name || customer.name,
            phone: shipping.phone || customer.phone,
          },
        }),
      });
      const body = await response.json().catch(() => ({}));

      if (
        !response.ok ||
        body.checkoutMode !== "embedded" ||
        typeof body.clientSecret !== "string" ||
        typeof body.sessionId !== "string"
      ) {
        trackCheckoutStep("checkout_error");
        setError(body.error ?? "Stripe Checkout is not available yet.");
        return;
      }

      const nextSession = {
        clientSecret: body.clientSecret,
        sessionId: body.sessionId,
        createdAt: Date.now(),
      };
      window.sessionStorage.setItem(
        `taprater:embedded-checkout:${body.sessionId}`,
        JSON.stringify(nextSession),
      );
      window.history.replaceState(
        null,
        "",
        `/checkout?session_id=${encodeURIComponent(body.sessionId)}`,
      );
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
          <h1 className="mt-1 text-2xl font-medium leading-tight text-ink">
            {step === "payment" ? "Payment" : "Shipping details"}
          </h1>
        </div>
        <Link
          href="/cart"
          className="tr-button-outline inline-flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          Back to cart
        </Link>
      </header>
      <ol className="flex gap-3 text-sm" aria-label="Checkout progress">
        <li
          aria-current={step === "details" ? "step" : undefined}
          className="flex-1 rounded-lg bg-panel px-3 py-3 font-semibold text-brand"
        >
          1. Contact &amp; shipping
        </li>
        <li
          aria-current={step === "payment" ? "step" : undefined}
          className={`flex-1 rounded-lg px-3 py-3 font-semibold ${step === "payment" ? "bg-panel text-brand" : "bg-soft text-muted"}`}
        >
          2. Payment
        </li>
      </ol>
      <div
        className={
          step === "payment"
            ? "grid gap-5"
            : "grid gap-5 lg:grid-cols-[390px_minmax(0,1fr)] lg:items-start"
        }
      >
        {step === "details" ? (
          <CheckoutSummary marketing={marketing} promotion={promotion} offers={offers}
            compact
            dueTodayCents={dueTodayCents}
            recurringTotalCents={recurringTotalCents}
            rows={rows}
            shippingAmountCents={shippingRule.amountCents}
            standTotalCents={standTotalCents}
            taxAmountCents={taxAmountCents}
            taxCalculationPending={
              taxSettings.taxMode === "manual" &&
              taxSettings.manualTaxRateBps > 0 &&
              !shipping.state.trim()
            }
            taxSettings={taxSettings}
          />
        ) : null}

        <section
          className={
            step === "payment"
              ? "grid gap-5 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]"
              : "tr-card min-h-[520px] p-4 sm:p-5"
          }
        >
          {step === "details" ? (
            <CheckoutDetailsForm startPayment={startPayment} hasHostedMultiLink={hasHostedMultiLink} customer={customer} setCustomer={setCustomer} shipping={shipping} setShipping={setShipping} differentRecipient={differentRecipient} setDifferentRecipient={setDifferentRecipient} setIsFillingAddress={setIsFillingAddress} error={error} reminderConsent={reminderConsent} setReminderConsent={setReminderConsent} isStartingPayment={isStartingPayment} isFillingAddress={isFillingAddress} rows={rows}/>
          ) : !stripePublicConfig.ok ? (
            <CheckoutError message={stripePublicConfig.error} />
          ) : !stripePromise ? (
            <CheckoutError message="Stripe could not be loaded." />
          ) : error ? (
            <CheckoutError message={error} />
          ) : session && options ? (
            <>
              <CheckoutSummary marketing={marketing} promotion={promotion} offers={offers}
                dueTodayCents={dueTodayCents}
                recurringTotalCents={recurringTotalCents}
                rows={rows}
                shippingAmountCents={shippingRule.amountCents}
                standTotalCents={standTotalCents}
                taxAmountCents={taxAmountCents}
                taxCalculationPending={false}
                taxSettings={taxSettings}
              />
              <section className="tr-card min-h-[420px] p-4 sm:p-5">
                <StripePaymentPanel stripe={stripePromise} options={options} />
              </section>
            </>
          ) : (
            <div className="grid min-h-[480px] place-items-center text-sm font-medium text-muted">
              Loading secure checkout...
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function createCheckoutAttemptId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `attempt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 14)}`;
}

function calculateRecurringTotalCents(rows: ReturnType<typeof getCartRows>) {
  return rows.reduce((sum, row) => {
    const hasHostedMultiLink =
      row.item.setup?.serviceMode === "HOSTED" &&
      row.item.setup?.serviceAddon === "hosted_multilink";
    return (
      sum +
      (hasHostedMultiLink
        ? (row.item.setup?.monthlyPriceCents ?? 0) * row.item.quantity
        : 0)
    );
  }, 0);
}
