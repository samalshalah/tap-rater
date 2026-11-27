/** Shop-by-business pages live at /business (they were at /solutions until Nov 2026). */
export const businessIndexPath = "/business";

export function businessPath(slug: string) {
  return `${businessIndexPath}/${slug}`;
}

/** Links saved in website content may still point at /solutions; send them straight to /business. */
export function toBusinessHref(href: string) {
  return href.replace(/^\/solutions(?=\/|$|\?|#)/, businessIndexPath);
}
