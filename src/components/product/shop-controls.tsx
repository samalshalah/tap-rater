"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition, type FormEvent } from "react";
import { buildShopHref, normalizeShopQuery, SHOP_SORT_OPTIONS, type ShopQuery } from "@/lib/shop-query";

export function ShopControls({ query }: { query: ShopQuery }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const nextQuery = normalizeShopQuery({ ...query, page: undefined, q: String(data.get("q") ?? ""), sort: String(data.get("sort") ?? "featured") });
    startTransition(() => router.push(buildShopHref(nextQuery), { scroll: false }));
  }

  return (
    <form action="/shop" method="get" role="search" aria-label="Shop products" onSubmit={submit} aria-busy={pending} className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_200px]">
      {query.type ? <input type="hidden" name="type" value={query.type} /> : null}
      {query.use ? <input type="hidden" name="use" value={query.use} /> : null}
      <div className="grid min-w-0 gap-2 text-sm font-semibold text-ink">
        <label htmlFor="shop-search">Search stands</label>
        <span className="flex min-w-0 overflow-hidden rounded-md border border-line bg-white focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15">
          <input id="shop-search" key={query.q ?? ""} type="search" name="q" defaultValue={query.q ?? ""} maxLength={120} placeholder="Product, platform, or keyword" className="h-11 w-full min-w-0 bg-transparent px-3 text-base font-normal outline-none" />
          <button type="submit" aria-label="Search stands" title="Search stands" disabled={pending} className="grid h-11 w-11 shrink-0 place-items-center border-l border-line text-brand transition hover:bg-panel focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50">
            <Search size={18} aria-hidden="true" />
          </button>
        </span>
      </div>
      <label className="grid min-w-0 gap-2 text-sm font-semibold text-ink">
        Sort by
        <select key={query.sort} name="sort" defaultValue={query.sort ?? "featured"} onChange={(event) => event.currentTarget.form?.requestSubmit()} disabled={pending} className="h-11 w-full min-w-0 rounded-md border border-line bg-white px-3 text-base font-normal text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:opacity-50">
          {SHOP_SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      <span className="sr-only" role="status">{pending ? "Updating products" : ""}</span>
    </form>
  );
}
