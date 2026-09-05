import type { MigratedProduct } from "@/data/migrated-products";
import { getCategoryBySlug } from "@/lib/products";
import { getLowestPurchasePriceCents, getProductPurchaseOptions } from "@/lib/purchase-options";
import { SHOP_PAGE_SIZE, type ShopQuery } from "@/lib/shop-query";

export function searchAndSortShopProducts(products: MigratedProduct[], query: ShopQuery) {
  const terms = query.q?.toLocaleLowerCase("en-US").split(/\s+/).filter(Boolean) ?? [];
  const matches = products.filter((product) => {
    const text = [
      product.title, product.shortDescription, product.sku,
      getCategoryBySlug(product.categorySlug)?.title,
      product.primaryPlatformSlug, ...(product.searchKeywords ?? []),
      ...(product.supportedDestinations ?? []),
    ].join(" ").toLocaleLowerCase("en-US");
    return terms.every((term) => text.includes(term));
  });

  if (query.sort === "name-asc") {
    return matches.sort((a, b) => a.title.localeCompare(b.title, "en", { sensitivity: "base", numeric: true }));
  }
  if (query.sort === "price-asc" || query.sort === "price-desc") {
    const direction = query.sort === "price-asc" ? 1 : -1;
    return matches.sort((a, b) => {
      const aPrice = getSortablePrice(a);
      const bPrice = getSortablePrice(b);
      // Products without a displayed purchase price follow priced products in either direction.
      if (aPrice === null) return bPrice === null ? 0 : 1;
      if (bPrice === null) return -1;
      return direction * (aPrice - bPrice);
    });
  }
  return matches;
}

function getSortablePrice(product: MigratedProduct) {
  return product.checkoutMode === "buy_now" && getProductPurchaseOptions(product).length
    ? getLowestPurchasePriceCents(product)
    : null;
}

export function getShopResultWindow(total: number, requestedPage = 1) {
  const lastPage = Math.max(1, Math.ceil(total / SHOP_PAGE_SIZE));
  const page = Math.min(Math.max(1, requestedPage), lastPage);
  const visibleCount = Math.min(total, page * SHOP_PAGE_SIZE);
  return { visibleCount, nextPage: page < lastPage ? page + 1 : undefined };
}
