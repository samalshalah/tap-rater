export function generateGoogleReviewUrl(placeId: string) {
  return `https://g.page/r/${encodeURIComponent(placeId.trim())}/review`;
}
