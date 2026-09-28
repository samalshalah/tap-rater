export function generateGoogleReviewUrl(placeId: string) {
  return `https://search.google.com/local/writereview?placeid=${encodeURIComponent(placeId.trim())}`;
}

export function normalizeGoogleReviewLink(value: string): string | undefined {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.username || url.password || url.port) return undefined;
    const reviewPage = ["search.google.com", "www.google.com", "google.com"].includes(url.hostname)
      && url.pathname === "/local/writereview" && Boolean(url.searchParams.get("placeid")?.trim());
    const profileReviewLink = url.hostname === "g.page" && /^\/r\/[^/]+\/review\/?$/.test(url.pathname);
    return reviewPage || profileReviewLink ? url.href : undefined;
  } catch {
    return undefined;
  }
}
