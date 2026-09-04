"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { formatPrice, getProductBySlug } from "@/lib/products";
import {
  calculateCartTotalCents,
  getCartItemKey,
  getCartRows,
  maxCartItemQuantity,
  type CartRow,
} from "@/lib/cart";
import { resolveCheckoutShippingRule } from "@/lib/shipping-rules";
import { getCheckoutTaxableAmountCents, getCheckoutTaxAmountCents, formatTaxRate } from "@/lib/tax-rules";
import { getProductVisual, productImageFallback } from "@/lib/storefront-visuals";
import type { TaxSettingsInput } from "@/lib/validators";

export function CartTable({
  manualCheckoutEnabled = false,
  stripeMode = "test",
  stripeCheckoutEnabled = true,
  taxSettings,
}: {
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

  const rows = getCartRows(items);
  const standTotal = calculateCartTotalCents(items);
  const recurringTotal = calculateRecurringTotalCents(rows);
  const shippingRule = resolveCheckoutShippingRule(standTotal);
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
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
      <div className="tr-card grid gap-0 p-4 sm:p-6">
        {rows.map((row) => {
          const cartKey = getCartItemKey(row.item);
          const rowImage = getCartRowImage(row);
          const hasHostedMultiLink = row.item.setup?.serviceMode === "HOSTED" && row.item.setup?.serviceAddon === "hosted_multilink";
          const connectionLabel = hasHostedMultiLink
            ? "Hosted Multi-Link"
            : row.option.hasQr
            ? "QR + NFC direct"
            : row.option.requiresDestinationUrl
              ? "NFC direct"
              : "";
          return (
            <div
              key={cartKey}
              className="grid gap-5 border-b border-line py-5 first:pt-0 last:border-b-0 last:pb-0 md:grid-cols-[96px_minmax(0,1fr)_auto] md:items-start"
            >
              <div className="grid h-24 w-24 place-items-center overflow-hidden rounded-md border border-line bg-soft">
                {rowImage.src ? (
                  <img
                    src={rowImage.src}
                    alt={rowImage.alt}
                    className="h-full w-full object-contain p-2"
                  />
                ) : (
                  <span className="text-xs text-muted">Stand</span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-base font-medium leading-6 text-ink">{row.product.title}</p>
                <p className="mt-1 text-sm font-medium text-brand">
                  {row.option.label}
                </p>
                <div className="mt-3 grid gap-1 text-sm leading-6 text-muted">
                  {row.item.setup?.destinationUrl ? (
                    <p className="break-words">
                      <span className="text-muted">Destination link:</span>{" "}
                      <span className="text-ink">{row.item.setup.destinationUrl}</span>
                    </p>
                  ) : null}
                  {row.item.setup?.businessName ? (
                    <p>
                      <span className="text-muted">Business name:</span>{" "}
                      <span className="text-ink">{row.item.setup.businessName}</span>
                    </p>
                  ) : null}
                  {row.option.requiresLogo ? (
                    <p>
                      <span className="text-muted">Logo:</span>{" "}
                      <span className="text-ink">
                        {row.item.setup?.logoMediaUrl ||
                        row.item.setup?.logoStorageKey
                          ? "Uploaded"
                          : row.item.setup?.designAssistanceRequested
                            ? "Tap Rater will prepare"
                            : "Missing"}
                      </span>
                    </p>
                  ) : null}
                  {connectionLabel ? (
                    <p>
                      <span className="text-muted">Connection:</span>{" "}
                      <span className="text-ink">{connectionLabel}</span>
                    </p>
                  ) : null}
                  {hasHostedMultiLink && row.item.setup?.monthlyPriceCents ? (
                    <p>
                      <span className="text-muted">Service:</span>{" "}
                      <span className="text-ink">{formatPrice(row.item.setup.monthlyPriceCents)}/mo Multi-Link hosting</span>
                    </p>
                  ) : null}
                  {hasHostedMultiLink ? (
                    <p>
                      <span className="text-muted">Links:</span>{" "}
                      <span className="text-ink">{row.item.setup?.multiLinkButtons?.length ? `${row.item.setup.multiLinkButtons.length} added` : "Skipped for later"}</span>
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-[auto_1fr_auto] sm:items-center md:min-w-52 md:grid-cols-1 md:justify-items-end">
                <div className="flex h-10 w-fit items-center overflow-hidden rounded-lg border border-line bg-white">
                  <button
                    type="button"
                    aria-label={`Decrease ${row.product.title} quantity`}
                    className="grid h-10 w-10 place-items-center text-ink hover:bg-soft disabled:cursor-not-allowed disabled:text-muted"
                    disabled={row.item.quantity <= 1}
                    onClick={() => decreaseItem(cartKey)}
                  >
                    <Minus size={16} />
                  </button>
                  <span className="grid h-10 min-w-11 place-items-center border-x border-line px-3 text-sm font-medium text-ink">
                    {row.item.quantity}
                  </span>
                  <button
                    type="button"
                    aria-label={`Increase ${row.product.title} quantity`}
                    className="grid h-10 w-10 place-items-center text-ink hover:bg-soft disabled:cursor-not-allowed disabled:text-muted"
                    disabled={row.item.quantity >= maxCartItemQuantity}
                    onClick={() => increaseItem(cartKey)}
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <div className="text-left sm:text-center md:text-right">
                  <p className="tr-caption uppercase">Item total</p>
                  <p className="text-lg font-medium text-ink">
                    {formatPrice(row.lineSubtotalCents)}
                  </p>
                  <p className="tr-caption">{formatPrice(row.unitPriceCents)} each</p>
                </div>
                <button
                  type="button"
                  aria-label={`Remove ${row.product.title}`}
                  className="tr-icon-button text-brand"
                  onClick={() => removeItem(cartKey)}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <aside className="tr-card grid gap-4 p-5 sm:p-6 lg:sticky lg:top-24">
        <div>
          <p className="tr-eyebrow">Order summary</p>
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
            <span className="text-muted">Stands</span>
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
            <span className="font-medium text-ink">{formatPrice(dueToday)}</span>
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
            <span className="text-muted">{taxSettings.taxLabel} ({formatTaxRate(taxSettings)})</span>
            <span className="text-right font-medium text-ink">Calculated after address</span>
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

function getCartRowImage(row: CartRow) {
  const product = getProductBySlug(row.item.productId);
  if (product) {
    const visual = getProductVisual(product);
    return visual;
  }

  const proofPreviewData = row.item.setup?.proofPreviewData;
  const previewImage =
    readString(proofPreviewData?.previewImageUrl) ??
    readString(row.item.setup?.frontTemplateUrl) ??
    readString(row.item.setup?.centerAssetUrl);

  return previewImage
    ? { src: previewImage, alt: row.product.title }
    : { ...productImageFallback, alt: row.product.title };
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function calculateRecurringTotalCents(rows: CartRow[]) {
  return rows.reduce((sum, row) => {
    const hasHostedMultiLink = row.item.setup?.serviceMode === "HOSTED" && row.item.setup?.serviceAddon === "hosted_multilink";
    return sum + (hasHostedMultiLink ? (row.item.setup?.monthlyPriceCents ?? 0) * row.item.quantity : 0);
  }, 0);
}
