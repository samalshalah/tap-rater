"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { formatPrice } from "@/lib/products";
import { calculateCartTotalCents, getCartItemKey, getCartRows } from "@/lib/cart";

export function CartTable({ stripeMode = "test" }: { stripeMode?: "test" | "live" }) {
  const { decreaseItem, increaseItem, items, removeItem } = useCart();
  const router = useRouter();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const isLiveStripe = stripeMode === "live";

  const rows = getCartRows(items);
  const total = calculateCartTotalCents(items);

  async function startCheckout() {
    setIsCheckingOut(true);
    setCheckoutError("");

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items })
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
          createdAt: Date.now()
        })
      );
      router.push(`/checkout?session_id=${encodeURIComponent(body.sessionId)}`);
    } catch {
      setCheckoutError("Stripe Checkout is not available yet.");
    } finally {
      setIsCheckingOut(false);
    }
  }

  if (rows.length === 0) {
    return (
      <div className="tr-card p-8 text-center">
        <p className="text-lg font-semibold text-ink">Your cart is empty.</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">
          Choose a ready NFC stand or contact support for a custom request.
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
    <div className="tr-card grid gap-5 p-4 sm:p-6">
      {rows.map((row) => {
        const cartKey = getCartItemKey(row.item);
        return (
        <div key={cartKey} className="grid gap-4 border-b border-line py-4 last:border-b-0 md:grid-cols-[1fr_auto_auto] md:items-center">
          <div>
            <p className="font-semibold text-ink">{row.product.title}</p>
            <p className="mt-1 text-sm font-semibold text-brand">{row.option.label}</p>
            <p className="text-sm text-muted">{formatPrice(row.unitPriceCents)} each</p>
            <div className="mt-2 grid gap-1 text-xs leading-5 text-muted">
              {row.item.setup?.businessName ? <p><strong className="text-ink">Business:</strong> {row.item.setup.businessName}</p> : null}
              {row.item.setup?.destinationUrl ? <p><strong className="text-ink">Destination link:</strong> {row.item.setup.destinationUrl}</p> : null}
              <p>
                <strong className="text-ink">Connection:</strong>{" "}
                QR and NFC open the destination link directly
              </p>
              {row.item.setup?.qrTargetUrl ? <p><strong className="text-ink">QR target:</strong> {row.item.setup.qrTargetUrl}</p> : null}
              {row.item.setup?.nfcTargetUrl ? <p><strong className="text-ink">NFC target:</strong> {row.item.setup.nfcTargetUrl}</p> : null}
              {row.item.setup?.headline ? <p><strong className="text-ink">Headline:</strong> {row.item.setup.headline}</p> : null}
              {row.item.setup?.designNotes ? <p><strong className="text-ink">Design notes:</strong> {row.item.setup.designNotes}</p> : null}
              {row.option.requiresLogo ? <p><strong className="text-ink">Logo:</strong> {row.item.setup?.logoMediaUrl || row.item.setup?.logoStorageKey ? "Logo uploaded" : "Missing"}</p> : null}
              {row.item.setup?.hasQr || row.option.hasQr ? <p><strong className="text-ink">QR:</strong> {row.item.setup?.generatedQrValue || row.item.setup?.qrTargetUrl ? "Direct QR ready" : "Missing"}</p> : null}
              {row.option.requiresFinalProof ? <p><strong className="text-ink">Proof:</strong> {row.item.setup?.proofApproved ? "Proof confirmed" : "Proof required"}</p> : null}
            </div>
          </div>
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
            <span className="grid h-10 min-w-12 place-items-center border-x border-line px-3 text-sm font-black text-ink">
              {row.item.quantity}
            </span>
            <button
              type="button"
              aria-label={`Increase ${row.product.title} quantity`}
              className="grid h-10 w-10 place-items-center text-ink hover:bg-soft"
              onClick={() => increaseItem(cartKey)}
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="flex items-center justify-between gap-4 md:min-w-44 md:justify-end">
            <div className="text-right">
              <p className="text-xs font-bold uppercase text-muted">Subtotal</p>
              <p className="font-black text-ink">{formatPrice(row.lineSubtotalCents)}</p>
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
      <div className="flex items-center justify-between border-t border-line pt-5 text-xl font-black">
        <span>Total</span>
        <span>{formatPrice(total)}</span>
      </div>
      <button
        type="button"
        disabled={isCheckingOut}
        className="tr-button-primary min-h-12"
        onClick={startCheckout}
      >
        {isCheckingOut ? "Starting secure checkout..." : isLiveStripe ? "Secure checkout" : "Secure checkout in Stripe test mode"}
      </button>
      <p className="text-sm leading-6 text-muted">
        {isLiveStripe
          ? "Payment opens inside Tap Rater with Stripe. Shipping is reviewed after payment. No shipping fee is added today."
          : "Test mode only. Stripe payment opens inside Tap Rater. Shipping is reviewed after payment, and no shipping fee is added today."}
      </p>
      {checkoutError ? (
        <p className="tr-status-warning">{checkoutError}</p>
      ) : null}
    </div>
  );
}
