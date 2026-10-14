"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ProductSetupChooser } from "@/components/product/product-setup-chooser";
import { useCart } from "@/components/cart/cart-provider";
import { getCartItemKey, type CartItem } from "@/lib/cart";
import type { parseMetaCheckout } from "@/lib/meta-checkout";
import type { OffersSettings, OfferQuote } from "@/lib/offers";
import { formatPrice } from "@/lib/products";

export function MetaCheckout({ entries, offers, quote, hasCoupon }: { entries: ReturnType<typeof parseMetaCheckout>; offers: OffersSettings; quote: OfferQuote; hasCoupon: boolean }) {
  const { items } = useCart();
  const [completed, setCompleted] = useState<Record<string, string>>({});
  const [active, setActive] = useState(0);
  const [restored, setRestored] = useState(false);
  const storageKey = `taprater:meta-setup:${entries.map(entry => `${entry.id}:${entry.quantity}`).join(",")}`;
  useEffect(() => {
    try { const saved = JSON.parse(sessionStorage.getItem(storageKey) ?? "{}"); if (saved && typeof saved === "object" && !Array.isArray(saved)) setCompleted(saved); } catch {}
    setRestored(true);
  }, [storageKey]);
  const done = (id: string) => items.some(item => getCartItemKey(item) === completed[id]);
  const allDone = entries.every(entry => done(entry.id));
  const entry = entries[active];
  function added(item: CartItem) {
    const next = { ...completed, [entry.id]: getCartItemKey(item) };
    setCompleted(next);
    try { sessionStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
    const nextIndex = entries.findIndex(candidate => candidate.id !== entry.id && !done(candidate.id));
    if (nextIndex >= 0) setActive(nextIndex);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  return <main className="tr-public-shell text-ink"><div className="tr-container max-w-4xl py-8">
    <p className="tr-eyebrow">Your Facebook or Instagram selection</p>
    <h1 className="mt-2 text-3xl font-semibold">Finish your stand setup</h1>
    <p className="mt-3 text-muted">Your selected designs and quantities are below. Add the business link for each stand, and approve artwork for Branded designs, before checkout.</p>
    {hasCoupon && <p role="status" className="mt-4 rounded-lg border border-line p-3">Coupon codes are not supported here. Your best eligible Tap Rater offer is applied automatically in your cart; review the final total before paying.</p>}
    <ul className="my-6 grid gap-2">{entries.map((item, index) => <li key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white p-4">
      <span>{item.product.title} · {item.optionId === "standard_direct" ? "Standard" : "Branded"} · Qty {item.quantity}<span className="mt-1 block text-sm text-muted">{formatPrice(item.unitAmountCents)} each · {formatPrice(item.unitAmountCents * item.quantity)} before offers</span></span>
      {done(item.id) ? <span className="font-medium text-brand">In your cart</span> : <button disabled={!restored} className="min-h-11 px-3 font-semibold text-brand underline" onClick={() => setActive(index)}>{index === active ? "Selected" : "Set up"}</button>}
    </li>)}</ul>
    <section aria-label="Order summary" className="tr-card mb-6 p-5">
      <h2 className="text-xl font-semibold">Order summary</h2>
      <dl className="mt-3 space-y-2">
        <div className="flex justify-between gap-3"><dt>Subtotal ({entries.reduce((sum, item) => sum + item.quantity, 0)} stands)</dt><dd>{formatPrice(quote.originalCents)}</dd></div>
        {quote.discountCents > 0 && <div className="flex justify-between gap-3 text-brand"><dt>{quote.label}</dt><dd>−{formatPrice(quote.discountCents)}</dd></div>}
        <div className="flex justify-between gap-3 border-t border-line pt-2 font-semibold"><dt>Total before shipping and tax</dt><dd>{formatPrice(quote.subtotalCents)}</dd></div>
      </dl>
      <p className="mt-3 text-sm text-muted">USD. This total covers your Facebook or Instagram selection. Complete setup below to add these stands to your cart. Shipping and tax are calculated at checkout; any other cart items or quantity changes may change your offers and total.</p>
    </section>
    {restored && !allDone && !done(entry.id) && <section className="tr-card p-5"><h2 className="mb-4 text-xl font-semibold">{entry.product.title}</h2><ProductSetupChooser key={entry.id} product={entry.product} offers={offers} selectedOptionId={entry.optionId} initialQuantity={entry.quantity} fixedSelection onAdded={added} /><p className="mt-3 text-sm text-muted">You can adjust quantities in your cart after setup.</p></section>}
    <div className="mt-6 flex gap-4"><Link href="/cart" className="rounded-full bg-brand px-6 py-3 font-semibold text-white">{allDone ? "Review cart and checkout" : "View your cart"}</Link><Link href="/shop" className="px-3 py-3 underline">Continue shopping</Link></div>
  </div></main>;
}
