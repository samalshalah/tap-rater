"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition, type ReactNode, type FormEvent } from "react";
import { buildShopHref, normalizeShopQuery, SHOP_SORT_OPTIONS, type ShopQuery } from "@/lib/shop-query";

export function ShopControls({ query, filters }: { query: ShopQuery; filters?: ReactNode }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const nextQuery = normalizeShopQuery({ ...query, page: undefined, q: String(data.get("q") ?? ""), sort: String(data.get("sort") ?? "featured") });
    startTransition(() => router.push(buildShopHref(nextQuery), { scroll: false }));
  }

  return (
    <form action="/shop" method="get" role="search" aria-label="Shop products" onSubmit={submit} aria-busy={pending} className="relative grid min-w-0 grid-cols-[72px_minmax(0,1fr)_96px] items-end gap-2 sm:grid-cols-[90px_minmax(0,1fr)_180px] lg:grid-cols-[minmax(0,1fr)_200px]">
      {filters}
      {query.type ? <input type="hidden" name="type" value={query.type} /> : null}
      {query.use ? <input type="hidden" name="use" value={query.use} /> : null}
      {query.design ? <input type="hidden" name="design" value={query.design} /> : null}
      <div className="grid min-w-0 gap-2 text-sm font-semibold text-ink">
        <label htmlFor="shop-search" className="sr-only lg:not-sr-only">Search stands</label>
        <span className="flex min-w-0 overflow-hidden rounded-md border border-line bg-white focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15">
          <input id="shop-search" key={query.q ?? ""} type="search" name="q" defaultValue={query.q ?? ""} maxLength={120} placeholder="Search" className="h-11 w-full min-w-0 bg-transparent px-2 text-base font-normal outline-none" />
          <button type="submit" aria-label="Search stands" title="Search stands" disabled={pending} className="grid h-11 w-11 shrink-0 place-items-center border-l border-line text-brand transition hover:bg-panel focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-50">
            <Search size={18} aria-hidden="true" />
          </button>
        </span>
      </div>
      <label className="grid min-w-0 gap-2 text-sm font-semibold text-ink">
        <span className="sr-only lg:not-sr-only">Sort by</span>
        <span className="relative block min-w-0"><span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-normal lg:hidden">Sort</span><select key={query.sort} name="sort" defaultValue={query.sort ?? "featured"} onChange={(event) => event.currentTarget.form?.requestSubmit()} disabled={pending} className="h-11 w-full min-w-0 rounded-md border border-line bg-white px-2 text-xs font-normal text-transparent lg:text-ink sm:text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/15 disabled:opacity-50">
          {SHOP_SORT_OPTIONS.map((option) => <option className="text-ink" key={option.value} value={option.value}>{option.label}</option>)}
        </select></span>
      </label>
      <span className="sr-only" role="status">{pending ? "Updating products" : ""}</span>
    </form>
  );
}
