import { beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ publicReads: vi.fn(), databaseReads: vi.fn() }));
vi.mock("next/cache", () => ({ unstable_noStore: vi.fn() }));
vi.mock("@/lib/public-data-cache", () => ({
  catalogCacheTag: "test",
  publicDataCache: (read: (...args: unknown[]) => Promise<unknown>) => async (...args: unknown[]) => {
    state.publicReads();return read(...args);
  },
}));
vi.mock("@/lib/db", () => ({
  hasSupabaseAdminConfig: () => true,
  getSupabaseAdmin: () => ({ from: () => ({ select: () => {
    state.databaseReads();
    const query = {
      eq: () => query,
      maybeSingle: async () => ({ data: null, error: null }),
      then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: [], error: null }).then(resolve),
    };
    return query;
  } }) }),
}));
import { getCheckoutProducts, getCheckoutProductBySlug, getStorefrontProducts, getStorefrontProductBySlug } from "@/lib/product-repository";
beforeEach(() => vi.clearAllMocks());
describe("catalog caching boundaries", () => {
  it("proof validation reads fresh and missing products remain unavailable", async () => {
    expect(await getCheckoutProductBySlug("missing-product")).toBeUndefined();
    expect(state.publicReads).not.toHaveBeenCalled();
    expect(await getStorefrontProductBySlug("missing-product")).toBeUndefined();
    expect(state.publicReads).toHaveBeenCalledTimes(1);
  });
  it("checkout always reads storage directly, including after a storefront cache read", async () => {
    await getStorefrontProducts();
    expect(state.publicReads).toHaveBeenCalledTimes(1);
    await getCheckoutProducts();await getCheckoutProducts();
    expect(state.publicReads).toHaveBeenCalledTimes(1);
    expect(state.databaseReads).toHaveBeenCalledTimes(3);
  });
});
