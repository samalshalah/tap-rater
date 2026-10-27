"use client";

import Link from "next/link";
import { quoteOffers, offerShippingSettings, type OffersSettings, type OfferQuote } from "@/lib/offers";
import type { ShippingSettingsInput } from "@/lib/validators";
import { OfferSummary } from "@/components/cart/offer-summary";
import { getCartOfferSuggestion } from "@/lib/cart-offer-suggestion";
import { useRouter } from "next/navigation";
import { CartItemList } from "@/components/cart/cart-item-list";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { formatPrice } from "@/lib/products";
import {
  getCartRows,
  type CartRow,
} from "@/lib/cart";
import { resolveCheckoutShippingRule } from "@/lib/shipping-rules";
import { getCheckoutTaxableAmountCents, getCheckoutTaxAmountCents } from "@/lib/tax-rules";
import type { TaxSettingsInput } from "@/lib/validators";

export function CartTable({
  offers, shippingSettings,
  manualCheckoutEnabled = false,
  stripeMode = "test",
  stripeCheckoutEnabled = true,
  taxSettings,
}: {
  offers: OffersSettings; shippingSettings: ShippingSettingsInput;
  manualCheckoutEnabled?: boolean;
  stripeMode?: "test" | "live";
  stripeCheckoutEnabled?: boolean;
  taxSettings: TaxSettingsInput;
}) {
  const { clearCart, decreaseItem, increaseItem, items, removeItem } = useCart();
  const router = useRouter();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [signedInCustomer, setSignedInCustomer] = useState<{ email: string; name?: string; businessName?: string } | null>(null);
  const usesStripeCheckout = stripeCheckoutEnabled;
  const usesManualCheckout = !usesStripeCheckout && manualCheckoutEnabled;
  const checkoutAvailable = usesStripeCheckout || usesManualCheckout;

  const rows = useMemo(() => getCartRows(items), [items]);
  const offerLines = useMemo(() => rows.map(r => ({ productId: r.item.productId, optionId: r.option.id, quantity: r.item.quantity, unitAmountCents: r.unitPriceCents, recurring: r.option.requiresSubscription || r.item.setup?.serviceMode === "HOSTED" })), [rows]);
  const promotion = useMemo(() => quoteOffers(offerLines, offers), [offerLines, offers]);
  const suggestion = useMemo(() => getCartOfferSuggestion(offerLines, offers), [offerLines, offers]);
  const suggestedRow = suggestion ? rows.find(row => row.item.productId === suggestion.productId && row.option.id === suggestion.optionId) : undefined;
  const standTotal = promotion.subtotalCents;
  const recurringTotal = useMemo(() => calculateRecurringTotalCents(rows), [rows]);
  const shippingRule = resolveCheckoutShippingRule(standTotal, offerShippingSettings(shippingSettings, offers));
  const taxAmountCents = getCheckoutTaxAmountCents(
    taxSettings,
    getCheckoutTaxableAmountCents({
      recurringTotalCents: recurringTotal,
      shippingAmountCents: shippingRule.amountCents,
      standTotalCents: standTotal,
      taxSettings
    })
  );
  const dueToday = standTotal + recurringTotal + shippingRule.amountCents + taxAmountCents;
  const checkoutEmail = signedInCustomer?.email ?? customerEmail;
  const checkoutName = signedInCustomer?.name ?? signedInCustomer?.businessName ?? customerName;

  useEffect(() => {
    let active = true;
    fetch("/api/account/session", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((body) => {
        if (!active || body?.authenticated !== true || typeof body.email !== "string") {
          return;
        }

        const sessionCustomer = {
          email: body.email,
          name: typeof body.name === "string" ? body.name : undefined,
          businessName: typeof body.businessName === "string" ? body.businessName : undefined
        };
        setSignedInCustomer(sessionCustomer);
        setCustomerEmail(sessionCustomer.email);
        setCustomerName(sessionCustomer.name ?? sessionCustomer.businessName ?? "");
      })
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  async function startCheckout() {
    router.push("/checkout");
  }

  async function submitManualOrder() {
    setIsCheckingOut(true);
    setCheckoutError("");

    try {
      const response = await fetch("/api/checkout/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          customer: {
            email: checkoutEmail,
            name: checkoutName
          }
        }),
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok || body.checkoutMode !== "manual" || typeof body.orderReference !== "string") {
        setCheckoutError(body.error ?? "Order could not be submitted.");
        return;
      }

      clearCart();
      router.push(`/checkout/success?manual_order=${encodeURIComponent(body.orderReference)}`);
    } catch {
      setCheckoutError("Order could not be submitted. Please refresh the cart and try again, or contact Tap Rater support with your account email.");
    } finally {
      setIsCheckingOut(false);
    }
  }

  if (rows.length === 0) {
    return (
      <div className="tr-card p-8 text-center sm:p-10">
        <p className="text-2xl font-semibold text-ink">Your cart is empty</p>
        <p className="tr-body-sm mx-auto mt-3 max-w-md">
          Choose a ready NFC stand and set the destination link before checkout.
        </p>
        <div className="mt-5 grid justify-center gap-3 sm:flex sm:flex-wrap">
          <Link href="/shop" className="tr-button-primary w-full sm:w-auto">
            Shop ready stands
          </Link>
          <Link href="/support" className="tr-button-outline w-full sm:w-auto">
            Request custom help
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <div className="tr-card grid gap-0 p-4 sm:p-6">
        <CartItemList rows={rows} decreaseItem={decreaseItem} increaseItem={increaseItem} removeItem={removeItem} />
        {suggestion && suggestedRow ? (
          <aside className="rounded-xl border border-brand/20 bg-brand/5 p-4 text-sm">
            <p className="font-semibold text-ink">Need another stand?</p>
            <p className="mt-2">Add one more {suggestedRow.product.title} with the same design and size for {formatPrice(suggestion.additionalCostCents)} more before shipping and tax. Your cart savings increase by {formatPrice(suggestion.extraSavingsCents)}.</p>
            <Link className="mt-3 inline-flex min-h-11 items-center font-semibold text-brand underline underline-offset-4" href={`/product/${suggestion.productId}?design=${suggestion.optionId === "branded_qr_direct" ? "branded" : "standard"}`}>Set up another stand</Link>
          </aside>
        ) : null}
      </div>
      {usesStripeCheckout ? <div className="col-span-full flex items-center justify-between gap-3 rounded-xl border border-line bg-white p-4 lg:hidden row-start-1">
        <div><p className="text-xs text-muted">Including shipping · before tax</p><p className="text-xl font-semibold">{formatPrice(standTotal + recurringTotal + shippingRule.amountCents)}</p>{recurringTotal > 0 ? <p className="text-xs text-muted">Includes {formatPrice(recurringTotal)}/mo hosting</p> : null}</div>
        <button type="button" className="tr-button-primary" onClick={startCheckout}>Checkout</button>
      </div> : null}
      <aside className="tr-card grid gap-4 p-5 sm:p-6 lg:sticky lg:top-24">
        <div>
          <p className="tr-eyebrow">Order summary</p>
          <OfferSummary quote={promotion} offers={offers} />
          <h2 className="mt-2 text-xl font-medium leading-snug text-ink">{usesManualCheckout ? "Order review" : "Checkout"}</h2>
        </div>
        {usesManualCheckout && !signedInCustomer ? (
          <div className="grid gap-2">
            <label className="grid gap-2 text-sm font-medium text-ink">
              Customer email
              <input
                type="email"
                value={customerEmail}
                onChange={(event) => setCustomerEmail(event.target.value)}
                autoComplete="email"
                required
                className="min-h-11 rounded-md border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
                placeholder="customer@example.com"
              />
            </label>
            <label className="grid gap-2 text-sm font-medium text-ink">
              Customer name
              <input
                type="text"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                autoComplete="name"
                className="min-h-11 rounded-md border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
                placeholder="Business or customer name"
              />
            </label>
          </div>
        ) : null}
        <div className="grid gap-3 border-y border-line py-4 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted">Stands after savings</span>
            <span className="font-medium text-ink">{formatPrice(standTotal)}</span>
          </div>
          {recurringTotal > 0 ? (
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted">Multi-Link monthly</span>
              <span className="font-medium text-ink">{formatPrice(recurringTotal)}/mo</span>
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted">Subtotal today</span>
            <span className="font-medium text-ink">{formatPrice(standTotal + recurringTotal)}</span>
          </div>
          {usesManualCheckout ? (
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted">Payment</span>
              <span className="text-right font-medium text-ink">No payment due now</span>
            </div>
          ) : !usesStripeCheckout ? (
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted">Payment</span>
              <span className="text-right font-medium text-ink">Temporarily unavailable</span>
            </div>
          ) : null}
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted">Shipping</span>
            <span className="text-right font-medium text-ink">
              {shippingRule.amountCents > 0 ? formatPrice(shippingRule.amountCents) : "Free"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted">Tax</span>
            <span className="text-right font-medium text-ink">{taxSettings.taxMode === "manual" && taxSettings.manualTaxRateBps > 0 ? "Enter shipping state" : formatPrice(0)}</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-lg">
            <span className="font-medium text-ink">Estimated total</span>
            <span className="font-medium text-ink">{usesManualCheckout ? "$0.00" : formatPrice(dueToday)}</span>
          </div>
        </div>
        {!checkoutAvailable ? (
          <p className="tr-status-warning" role="alert">
            Secure checkout is temporarily unavailable. Your cart is saved; please try again shortly.
          </p>
        ) : null}
        <button
          type="button"
          disabled={!checkoutAvailable || isCheckingOut || (usesManualCheckout && !checkoutEmail.trim())}
          className="tr-button-primary min-h-12 w-full"
          onClick={usesStripeCheckout ? startCheckout : usesManualCheckout ? submitManualOrder : undefined}
        >
          {isCheckingOut
            ? usesStripeCheckout
              ? "Starting secure checkout..."
              : "Submitting review request..."
            : usesStripeCheckout
              ? "Secure checkout"
              : usesManualCheckout
                ? "Submit order for review"
                : "Checkout unavailable"}
        </button>
        <p className="tr-body-sm">
          {usesStripeCheckout
            ? "Enter shipping first, then pay securely inside Tap Rater with Stripe."
            : usesManualCheckout
              ? "Tap Rater will review payment, shipping, and artwork details before production."
              : "No order will be submitted until secure payment is available."}
        </p>
        {checkoutError ? (
          <p className="tr-status-warning" role="alert">{checkoutError}</p>
        ) : null}
      </aside>
    </div>
  );
}

function calculateRecurringTotalCents(rows: CartRow[]) {
  return rows.reduce((sum, row) => {
    const hasHostedMultiLink = row.item.setup?.serviceMode === "HOSTED" && row.item.setup?.serviceAddon === "hosted_multilink";
    return sum + (hasHostedMultiLink ? (row.item.setup?.monthlyPriceCents ?? 0) * row.item.quantity : 0);
  }, 0);
}
