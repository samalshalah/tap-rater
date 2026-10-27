import { describe, expect, it } from "vitest";
import type { ProductCsvClient } from "@/lib/admin-product-csv";
import { getBusinessUseSlugsByProductSlug, getProductOptionsByProductSlug } from "@/lib/admin-product-csv-loader";
function clientFor(data: unknown[], error: { message: string } | null = null) {
  const calls: string[] = [];
  const query = { in: () => query, order: () => Promise.resolve({ data, error }) };
  const client = { from: (table: string) => { calls.push(table); return { select: () => query }; } } as unknown as ProductCsvClient;
  return { client, calls };
}
describe("CSV related-row grouping", () => {
  it("preserves business-use order and duplicates while separating products", async () => {
    const { client } = clientFor([{ product_slug: "a", business_use_slug: "one" }, { product_slug: "b", business_use_slug: "two" }, { product_slug: "a", business_use_slug: "three" }, { product_slug: "a", business_use_slug: "one" }, {}, null]);
    expect([...await getBusinessUseSlugsByProductSlug(client, ["a", "b"])]).toEqual([["a", ["one", "three", "one"]], ["b", ["two"]]]);
  });
  it("preserves option order and skips invalid options", async () => {
    const row = (slug: string, title: string) => ({ product_slug: slug, option_code: "standard_direct", title, price_cents: 100 });
    const { client } = clientFor([row("a", "first"), row("b", "other"), row("a", "second"), { ...row("a", "bad"), price_cents: "100" }, null]);
    const result = await getProductOptionsByProductSlug(client, ["a", "b"]);
    expect(result.get("a")?.map(x => x.title)).toEqual(["first", "second"]);
    expect(result.get("b")?.map(x => x.title)).toEqual(["other"]);
  });
  it("returns empty maps without database reads for an empty catalog", async () => {
    const { client, calls } = clientFor([]);
    expect((await getBusinessUseSlugsByProductSlug(client, [])).size).toBe(0);
    expect((await getProductOptionsByProductSlug(client, [])).size).toBe(0);
    expect(calls).toEqual([]);
  });
  it("propagates database failures", async () => {
    const { client } = clientFor([], { message: "lookup failed" });
    await expect(getBusinessUseSlugsByProductSlug(client, ["a"])).rejects.toThrow("lookup failed");
    await expect(getProductOptionsByProductSlug(client, ["a"])).rejects.toThrow("lookup failed");
  });
  it("does not share mutable groups across loads", async () => {
    const { client } = clientFor([{ product_slug: "a", business_use_slug: "one" }]);
    const first = await getBusinessUseSlugsByProductSlug(client, ["a"]);
    first.get("a")!.push("local");
    const second = await getBusinessUseSlugsByProductSlug(client, ["a"]);
    expect(second.get("a")).toEqual(["one"]);
  });
});
