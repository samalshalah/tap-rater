"use client";

import { Building2, Check, MapPin, Minus, Plus, ShoppingCart } from "lucide-react";
import { useCart } from "@/components/cart/cart-provider";
import { getCartItemKey, type CartItem } from "@/lib/cart";
import { formatPrice } from "@/lib/products";
import { hostedMultiLinkServiceAddon } from "@/lib/service-addons";

const isPage = (item: CartItem) => item.setup?.serviceAddon === "hosted_multilink";
const pageName = (item: CartItem) => item.setup?.businessName?.trim() || "Your business";

/** Words every name starts with, e.g. "Priority Toyota" for "Priority Toyota Chesapeake" and "… Norfolk". */
function sharedName(names: string[]) {
  const split = names.map((name) => name.split(/\s+/));
  const shared: string[] = [];
  for (let i = 0; split.every((words) => words[i] !== undefined && words[i] === split[0][i]); i++) shared.push(split[0][i]);
  return shared.join(" ") || names[0];
}

/**
 * Shown after a Multi-Link page is added to the cart: the customer can add another location of the
 * same business (copied, only the Google location changes), a different business, or check out.
 */
export function MultiLinkAddedPanel({ added, items, onAnotherLocation, onDifferentBusiness, onCheckout }: {
  added: CartItem;
  items: CartItem[];
  onAnotherLocation: () => void;
  onDifferentBusiness: () => void;
  onCheckout: () => void;
}) {
  const { increaseItem, decreaseItem } = useCart();
  const pages = items.filter(isPage);
  // Pages with the same logo are one business with several locations.
  const groups = new Map<string, CartItem[]>();
  for (const page of pages) {
    const key = page.setup?.logoStorageKey || pageName(page);
    groups.set(key, [...(groups.get(key) ?? []), page]);
  }
  const stands = pages.reduce((sum, page) => sum + page.quantity, 0);
  const monthly = pages.length * hostedMultiLinkServiceAddon.monthlyPriceCents;
  const addedName = pageName(added);

  return <>
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">
      <div className="mx-auto grid max-w-2xl gap-5">
        <p className="flex items-center gap-2 text-base font-semibold text-ink" role="status">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand text-white"><Check size={16} aria-hidden="true" /></span>
          {addedName} · {added.quantity} {added.quantity === 1 ? "stand" : "stands"} added
        </p>

        <section aria-label="Multi-Link pages in your cart" className="rounded-xl border border-line bg-soft p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">In your cart</p>
          <ul className="mt-2 grid gap-2 text-sm">
            {[...groups.entries()].map(([key, group]) => (
              <li key={key}>
                <p className="font-semibold text-ink">{sharedName(group.map(pageName))}{group.length > 1 ? <span className="font-normal text-muted"> · {group.length} locations</span> : null}</p>
                <ul className="mt-1 grid gap-1">
                  {group.map((page) => {
                    const cartKey = getCartItemKey(page);
                    return <li key={cartKey} className="flex items-center justify-between gap-3">
                      <span className="min-w-0 truncate text-muted">{pageName(page)}</span>
                      <span className="flex shrink-0 items-center gap-1" aria-label={`Stands for ${pageName(page)}`}>
                        <button type="button" className="grid h-7 w-7 place-items-center rounded-md border border-line bg-white disabled:opacity-40" aria-label={`One fewer stand for ${pageName(page)}`} disabled={page.quantity <= 1} onClick={() => decreaseItem(cartKey)}><Minus size={13} aria-hidden="true" /></button>
                        <span className="w-16 text-center text-ink">{page.quantity} {page.quantity === 1 ? "stand" : "stands"}</span>
                        <button type="button" className="grid h-7 w-7 place-items-center rounded-md border border-line bg-white" aria-label={`One more stand for ${pageName(page)}`} onClick={() => increaseItem(cartKey)}><Plus size={13} aria-hidden="true" /></button>
                      </span>
                    </li>;
                  })}
                </ul>
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-line pt-3 text-sm text-ink">
            {stands} {stands === 1 ? "stand" : "stands"} · {pages.length} Multi-Link {pages.length === 1 ? "page" : "pages"} × {formatPrice(hostedMultiLinkServiceAddon.monthlyPriceCents)}/month = <strong>{formatPrice(monthly)}/month</strong>
          </p>
        </section>

        <div className="grid gap-3 sm:grid-cols-2">
          <button type="button" className="grid gap-1 rounded-xl border border-line bg-white p-4 text-left transition hover:border-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand" onClick={onAnotherLocation}>
            <span className="flex items-center gap-2 font-semibold text-ink"><MapPin size={17} aria-hidden="true" />Add another location</span>
            <span className="text-sm text-muted">Same logo, links and design. Just pick the location on Google.</span>
          </button>
          <button type="button" className="grid gap-1 rounded-xl border border-line bg-white p-4 text-left transition hover:border-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand" onClick={onDifferentBusiness}>
            <span className="flex items-center gap-2 font-semibold text-ink"><Building2 size={17} aria-hidden="true" />Add a different business</span>
            <span className="text-sm text-muted">Its own name, logo and stand design. Your links are copied to start.</span>
          </button>
        </div>
        <p className="text-xs text-muted">Each location or business gets its own page, Google review link and Insights, at {formatPrice(hostedMultiLinkServiceAddon.monthlyPriceCents)}/month per page. All in one payment.</p>
      </div>
    </div>
    <div className="flex justify-end border-t border-line bg-white px-4 py-4 sm:px-6">
      <button type="button" className="tr-button-primary" onClick={onCheckout}><ShoppingCart size={16} aria-hidden="true" />Go to checkout</button>
    </div>
  </>;
}
