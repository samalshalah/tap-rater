// Keep the local Next server and Cloudflare asset binding on the same aliases.
export const legacyPublicAssetRewrites = [
  {
    source: "/uploads/products/social-media-stand.png",
    destination: "/uploads/products/taprater-text-stands/follow-us-on-social-media/follow-us-on-social-media-standard-angled.png"
  },
  ...[160, 640, 1200].map((width) => ({
    source: `/uploads-optimized/products/social-media-stand-w${width}.webp`,
    destination: `/uploads-optimized/products/taprater-text-stands/follow-us-on-social-media/follow-us-on-social-media-standard-angled-w${width}.webp`
  }))
];

export function getLegacyPublicAssetUrl(request: Request) {
  if (request.method !== "GET" && request.method !== "HEAD") return undefined;
  const url = new URL(request.url);
  const alias = legacyPublicAssetRewrites.find(({ source }) => source === url.pathname);
  if (!alias) return undefined;
  url.pathname = alias.destination;
  return url;
}
