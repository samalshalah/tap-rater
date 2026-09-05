export const SHOP_PAGE_SIZE = 12;
export const SHOP_SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "name-asc", label: "Name: A to Z" },
] as const;

export type ShopSort = (typeof SHOP_SORT_OPTIONS)[number]["value"];
export type ShopQuery = { type?: string; use?: string; q?: string; sort?: ShopSort; page?: number };
export type ShopSearchParams = Partial<Record<keyof ShopQuery, string | string[]>>;

export function normalizeShopQuery(params: ShopSearchParams = {}): ShopQuery {
  const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
  const sort = first(params.sort);
  const page = Number(first(params.page));

  return {
    type: first(params.type),
    use: first(params.use),
    q: first(params.q)?.trim().replace(/\s+/g, " ").slice(0, 120) || undefined,
    sort: SHOP_SORT_OPTIONS.find((option) => option.value === sort)?.value ?? "featured",
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
  };
}

export function buildShopHref({ type, use, q, sort, page }: ShopQuery) {
  const params = new URLSearchParams();
  if (type) params.set("type", type);
  if (use) params.set("use", use);
  if (q) params.set("q", q);
  if (sort && sort !== "featured") params.set("sort", sort);
  if (page && page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/shop?${query}` : "/shop";
}
