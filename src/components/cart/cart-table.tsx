"use client";

import Link from "next/link";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/components/cart/cart-provider";
import { formatPrice } from "@/lib/products";
import { calculateCartTotalCents, getCartItemKey, getCartRows } from "@/lib/cart";

export function CartTable({ stripeMode = "test" }: { stripeMode?: "test" | "live" }) {
  const { decreaseItem, increaseItem, items, removeItem } = useCart();
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

      if (!response.ok || typeof body.url !== "string") {
        setCheckoutError(body.error ?? "Stripe Checkout is not available yet.");
        return;
      }

      window.location.href = body.url;
    } catch {
      setCheckoutError("Stripe Checkout is not available yet.");
    } finally {
      setIsCheckingOut(false);
    }
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-[18px] border border-line bg-white p-8 text-center shadow-sm">
        <p className="text-muted">Your cart is empty.</p>
        <Link href="/shop" className="mt-5 inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-sm font-black text-white hover:bg-brand">
          Shop products
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-5 rounded-[22px] border border-line bg-white p-4 shadow-sm sm:p-6">
      {rows.map((row) => {
        const cartKey = getCartItemKey(row.item);
        return (
        <div key={cartKey} className="grid gap-4 border-b border-line py-4 last:border-b-0 md:grid-cols-[1fr_auto_auto] md:items-center">
          <div>
            <p className="font-black text-ink">{row.product.title}</p>
            <p className="mt-1 text-sm font-black text-brand">{row.option.label}</p>
            <p className="text-sm text-muted">{formatPrice(row.unitPriceCents)} each</p>
            <div className="mt-2 grid gap-1 text-xs leading-5 text-muted">
              {row.item.setup?.businessName ? <p><strong className="text-ink">Business:</strong> {row.item.setup.businessName}</p> : null}
              {row.item.setup?.destinationUrl ? <p><strong className="text-ink">Link:</strong> {row.item.setup.destinationUrl}</p> : null}
              <p>
                <strong className="text-ink">Connection:</strong>{" "}
                {row.item.setup?.hasQr || row.option.hasQr ? "NFC + printed QR" : "NFC only, no printed QR"}
              </p>
              {row.item.setup?.headline ? <p><strong className="text-ink">Headline:</strong> {row.item.setup.headline}</p> : null}
              {row.item.setup?.designNotes ? <p><strong className="text-ink">Design notes:</strong> {row.item.setup.designNotes}</p> : null}
              {row.option.requiresLogo ? <p><strong className="text-ink">Logo:</strong> {row.item.setup?.logoMediaUrl || row.item.setup?.logoStorageKey ? "Uploaded" : "Missing"}</p> : null}
              {row.option.hasQr ? <p><strong className="text-ink">QR:</strong> {row.item.setup?.generatedQrValue ? "Generated from destination link" : "Missing"}</p> : null}
              {row.option.requiresFinalProof ? <p><strong className="text-ink">Proof:</strong> {row.item.setup?.proofApproved ? "Preview confirmed" : "Preview required"}</p> : null}
            </div>
          </div>
          <div className="flex h-10 w-fit items-center overflow-hidden rounded-full border border-line">
            <button
              type="button"
              aria-label={`Decrease ${row.product.title} quantity`}
              className="grid h-10 w-10 place-items-center text-ink hover:bg-gray-50 disabled:cursor-not-allowed disabled:text-muted"
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
              className="grid h-10 w-10 place-items-center text-ink hover:bg-gray-50"
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
              className="grid h-10 w-10 place-items-center rounded-full border border-line text-brand hover:bg-gray-50"
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
        className="min-h-12 rounded-full bg-ink px-5 text-sm font-black text-white hover:bg-brand disabled:cursor-not-allowed disabled:bg-gray-300"
        onClick={startCheckout}
      >
        {isCheckingOut ? "Starting Stripe Checkout..." : isLiveStripe ? "Checkout with Stripe" : "Checkout with Stripe test mode"}
      </button>
      <p className="text-sm leading-6 text-muted">
        {isLiveStripe
          ? "Secure payment through Stripe. Branded stands include the uploaded logo and proof details for production review before printing."
          : "Test mode only. Use Stripe test cards; live payments stay disabled until explicitly approved."}
      </p>
      {checkoutError ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm font-semibold text-ink">{checkoutError}</p>
      ) : null}
    </div>
  );
}
