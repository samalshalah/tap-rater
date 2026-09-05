import type { MigratedProduct } from "@/data/migrated-products";

export function selectMobileHomepageProducts(groups: MigratedProduct[][]) {
  const selected: MigratedProduct[] = [];
  const seen = new Set<string>();
  const rounds = Math.max(0, ...groups.map((group) => group.length));

  // Give each category a place before taking a second product from any category.
  for (let index = 0; index < rounds; index++) {
    for (const group of groups) {
      const product = group[index];
      if (!product || seen.has(product.slug)) continue;
      selected.push(product);
      seen.add(product.slug);
      if (selected.length === 6) return selected;
    }
  }

  return selected;
}
