export const legacyProductSlugAliases: Record<string, string> = {
  "book-appointment-stand": "book-your-next-visit-stand",
  "view-menu-stand": "view-our-menu-stand",
  "follow-us-stand": "follow-us-social-media-stand",
  "visit-website-stand": "visit-our-website-stand"
};

export function getCanonicalProductSlug(slug: string) {
  return legacyProductSlugAliases[slug] ?? slug;
}
