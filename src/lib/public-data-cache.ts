import { unstable_cache, revalidateTag } from "next/cache";

export const websiteCacheTag = "public-website-v1";
export const catalogCacheTag = "public-catalog-v1";

// Enable only when the deployment has persistent cache and tag bindings.
// Local previews and checkout's direct repository reads remain fresh.
export function publicDataCache<Args extends unknown[], Result>(
  read: (...args: Args) => Promise<Result>, key: string, tag: string,
) {
  const cached = (...args: Args) => unstable_cache(read, [key], { tags: [tag], revalidate: 60 })(...args);
  return (...args: Args) => process.env.PUBLIC_DATA_CACHE_ENABLED === "true" ? cached(...args) : read(...args);
}

export function invalidatePublicData(tag: string) {
  if (process.env.PUBLIC_DATA_CACHE_ENABLED === "true") revalidateTag(tag, { expire: 0 });
}
