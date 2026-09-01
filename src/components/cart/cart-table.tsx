"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleUserRound, Minus, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { formatPrice } from "@/lib/products";
import {
  calculateCartTotalCents,
  getCartItemKey,
  getCartRows,
} from "@/lib/cart";

export function CartTable({
  stripeMode = "test",
}: {
  stripeMode?: "test" | "live";
}) {
  const { clearCart, decreaseItem, increaseItem, items, removeItem } = useCart();
  const router = useRouter();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [signedInCustomer, setSignedInCustomer] = useState<{ email: string; name?: string; businessName?: string } | null>(null);
  const isLiveStripe = stripeMode === "live";

  const rows = getCartRows(items);
  const total = calculateCartTotalCents(items);
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
    setIsCheckingOut(true);
    setCheckoutError("");

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const body = await response.json().catch(() => ({}));

      if (
        !response.ok ||
        body.checkoutMode !== "embedded" ||
        typeof body.clientSecret !== "string" ||
        typeof body.sessionId !== "string"
      ) {
        setCheckoutError(body.error ?? "Stripe Checkout is not available yet.");
        return;
      }

      window.sessionStorage.setItem(
        `taprater:embedded-checkout:${body.sessionId}`,
        JSON.stringify({
          clientSecret: body.clientSecret,
          sessionId: body.sessionId,
          createdAt: Date.now(),
        }),
      );
      router.push(`/checkout?session_id=${encodeURIComponent(body.sessionId)}`);
    } catch {
      setCheckoutError("Stripe Checkout is not available yet.");
    } finally {
      setIsCheckingOut(false);
    }
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
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
      <div className="tr-card grid gap-0 p-4 sm:p-6">
        {rows.map((row) => {
          const cartKey = getCartItemKey(row.item);
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
              className="grid gap-5 border-b border-line py-5 first:pt-0 last:border-b-0 last:pb-0 md:grid-cols-[minmax(0,1fr)_auto] md:items-start"
            >
              <div className="min-w-0">
                <p className="text-lg font-semibold leading-6 text-ink">{row.product.title}</p>
                <p className="mt-1 text-sm font-semibold text-brand">
                  {row.option.label}
                </p>
                <div className="mt-3 grid gap-1 text-sm leading-6 text-muted">
                  {row.item.setup?.destinationUrl ? (
                    <p className="break-words">
                      <strong className="text-ink">Destination link:</strong>{" "}
                      {row.item.setup.destinationUrl}
                    </p>
                  ) : null}
                  {row.item.setup?.businessName ? (
                    <p>
                      <strong className="text-ink">Business name:</strong>{" "}
                      {row.item.setup.businessName}
                    </p>
                  ) : null}
                  {row.option.requiresLogo ? (
                    <p>
                      <strong className="text-ink">Logo:</strong>{" "}
                      {row.item.setup?.logoMediaUrl ||
                      row.item.setup?.logoStorageKey
                        ? "Uploaded"
                        : row.item.setup?.designAssistanceRequested
                          ? "Tap Rater will prepare"
                          : "Missing"}
                    </p>
                  ) : null}
                  {connectionLabel ? (
                    <p>
                      <strong className="text-ink">Connection:</strong> {connectionLabel}
                    </p>
                  ) : null}
                  {hasHostedMultiLink && row.item.setup?.monthlyPriceCents ? (
                    <p>
                      <strong className="text-ink">Service:</strong>{" "}
                      {formatPrice(row.item.setup.monthlyPriceCents)}/mo Multi-Link hosting
                    </p>
                  ) : null}
                  {hasHostedMultiLink ? (
                    <p>
                      <strong className="text-ink">Links:</strong>{" "}
                      {row.item.setup?.multiLinkButtons?.length ? `${row.item.setup.multiLinkButtons.length} added` : "Skipped for later"}
                    </p>
                  ) : null}
                  {row.option.requiresFinalProof ? (
                    <p>
                      <strong className="text-ink">Front proof:</strong>{" "}
                      {row.item.setup?.proofApproved
                        ? "Approved"
                        : row.item.setup?.designAssistanceRequested
                          ? "Tap Rater will send proof"
                          : "Approval required"}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-[auto_1fr_auto] sm:items-center md:min-w-56 md:grid-cols-1 md:justify-items-end">
                <div className="flex h-11 w-fit items-center overflow-hidden rounded-lg border border-line bg-white">
                  <button
                    type="button"
                    aria-label={`Decrease ${row.product.title} quantity`}
                    className="grid h-11 w-11 place-items-center text-ink hover:bg-soft disabled:cursor-not-allowed disabled:text-muted"
                    disabled={row.item.quantity <= 1}
                    onClick={() => decreaseItem(cartKey)}
                  >
                    <Minus size={16} />
                  </button>
                  <span className="grid h-11 min-w-12 place-items-center border-x border-line px-3 text-sm font-semibold text-ink">
                    {row.item.quantity}
                  </span>
                  <button
                    type="button"
                    aria-label={`Increase ${row.product.title} quantity`}
                    className="grid h-11 w-11 place-items-center text-ink hover:bg-soft"
                    onClick={() => increaseItem(cartKey)}
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <div className="text-left sm:text-center md:text-right">
                  <p className="tr-caption font-semibold uppercase">Item total</p>
                  <p className="text-lg font-semibold text-ink">
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
          <h2 className="mt-2 text-2xl font-semibold text-ink">{isLiveStripe ? "Checkout" : "Submit order"}</h2>
        </div>
        {!isLiveStripe ? (
          <div className="grid gap-3">
            {signedInCustomer ? (
              <div className="rounded-md border border-line bg-soft p-3 text-sm">
                <div className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-brand">
                    <CircleUserRound size={19} />
                  </span>
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">Signed in account</p>
                    <p className="mt-1 break-all text-muted">{signedInCustomer.email}</p>
                    <p className="mt-1 text-muted">{checkoutName || "Customer name will be confirmed during review."}</p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <label className="grid gap-2 text-sm font-semibold text-ink">
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
                <label className="grid gap-2 text-sm font-semibold text-ink">
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
              </>
            )}
          </div>
        ) : null}
        <div className="grid gap-3 border-y border-line py-4 text-sm">
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted">Subtotal</span>
            <span className="font-semibold text-ink">{formatPrice(total)}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-muted">Shipping</span>
            <span className="font-semibold text-ink">Reviewed after payment</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-lg">
            <span className="font-semibold text-ink">Total today</span>
            <span className="font-semibold text-ink">{formatPrice(total)}</span>
          </div>
        </div>
        <button
          type="button"
          disabled={isCheckingOut || (!isLiveStripe && !checkoutEmail.trim())}
          className="tr-button-primary min-h-12 w-full"
          onClick={isLiveStripe ? startCheckout : submitManualOrder}
        >
          {isCheckingOut
            ? isLiveStripe
              ? "Starting secure checkout..."
              : "Submitting order..."
            : isLiveStripe
              ? "Secure checkout"
              : "Submit order"}
        </button>
        <p className="tr-body-sm">
          {isLiveStripe
            ? "Payment opens inside Tap Rater with Stripe. No shipping fee is added today."
            : "Payment will be handled after Tap Rater reviews the submitted order."}
        </p>
        {checkoutError ? (
          <p className="tr-status-warning" role="alert">{checkoutError}</p>
        ) : null}
      </aside>
    </div>
  );
}
