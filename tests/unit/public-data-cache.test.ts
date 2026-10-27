import { afterEach, describe, expect, it, vi } from "vitest";
const next = vi.hoisted(() => ({ cache: vi.fn((read: (...args: unknown[]) => Promise<unknown>) => read), invalidate: vi.fn() }));
vi.mock("next/cache", () => ({ unstable_cache: next.cache, revalidateTag: next.invalidate }));
import { publicDataCache, invalidatePublicData, websiteCacheTag } from "@/lib/public-data-cache";

afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
describe("public data cache deployment boundary", () => {
  it("uses persistent cache only when configured, with a bounded TTL and immediate invalidation", async () => {
    vi.stubEnv("PUBLIC_DATA_CACHE_ENABLED", "true");
    const read = vi.fn(async (slug: string) => ({ slug }));
    expect(await publicDataCache(read, "catalog-test", websiteCacheTag)("stand")).toEqual({ slug: "stand" });
    expect(next.cache).toHaveBeenCalledWith(read, ["catalog-test"], { tags: [websiteCacheTag], revalidate: 60 });
    invalidatePublicData(websiteCacheTag);
    expect(next.invalidate).toHaveBeenCalledWith(websiteCacheTag, { expire: 0 });
  });
  it("reads fresh data when bindings are not enabled", async () => {
    vi.stubEnv("PUBLIC_DATA_CACHE_ENABLED", "false");
    const read = vi.fn().mockResolvedValueOnce(1).mockResolvedValueOnce(2);
    const get = publicDataCache(read, "test", websiteCacheTag);
    expect(await get()).toBe(1);
    expect(await get()).toBe(2);
    expect(next.cache).not.toHaveBeenCalled();
    invalidatePublicData(websiteCacheTag);
    expect(next.invalidate).not.toHaveBeenCalled();
  });
  it("propagates failures instead of caching an empty catalog", async () => {
    vi.stubEnv("PUBLIC_DATA_CACHE_ENABLED", "true");
    const get = publicDataCache(async () => { throw new Error("database unavailable"); }, "test", websiteCacheTag);
    await expect(get()).rejects.toThrow("database unavailable");
  });
});
