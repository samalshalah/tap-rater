import { hostedPageButtonLimit, type HostedPageEditorButtonType } from "@/lib/hosted-page-editor-shared";

/**
 * Business types for Multi-Link setup. Each one recommends the links its customers look for,
 * so a spa starts with "Book again · Review · Tip · Gift cards", not a generic list.
 * Ids match the catalog's business-use slugs.
 */
export type MultiLinkIndustryId =
  | "automotive"
  | "restaurant-food"
  | "beauty-salon-wellness"
  | "healthcare-dental"
  | "hotel-travel"
  | "home-services"
  | "legal"
  | "real-estate"
  | "retail-local-business"
  | "other";

export type RecommendedLink = { type: HostedPageEditorButtonType; label?: string };

/** What the stand's headline asks for: general (default), reviews, social or ordering. */
type Focus = "general" | "reviews" | "social" | "order";

type SocialType = "instagram" | "facebook" | "tiktok" | "youtube" | "x" | "linkedin" | "pinterest" | "snapchat";

/**
 * links.reviews: what a Rate Your Experience page starts with. Researched Nov 2026: Google first; no
 * sites that only take reviews from people who booked through them (OpenTable, Booking.com, Expedia,
 * Airbnb, Zocdoc); Yelp is never a default because Yelp asks businesses not to request reviews.
 * social: every platform, in the order that business's customers use most. Links left empty are
 * never published, so customers just fill in the ones they have.
 */
type Industry = { id: MultiLinkIndustryId; label: string; social: SocialType[]; links: Record<"general" | "reviews", RecommendedLink[]> & Partial<Record<"order", RecommendedLink[]>> };

const links = (...types: HostedPageEditorButtonType[]): RecommendedLink[] => types.map((type) => ({ type }));

export const multiLinkIndustries: Industry[] = [
  { id: "automotive", label: "Car dealership or auto service", social: ["facebook", "youtube", "instagram", "tiktok", "x", "linkedin", "pinterest", "snapchat"], links: {
    general: [{ type: "google_review" }, { type: "appointment", label: "Book Service" }, { type: "website", label: "Shop Inventory" }, { type: "dealerrater" }, { type: "facebook" }],
    reviews: links("google_review", "dealerrater", "cars_com", "cargurus", "edmunds", "autotrader", "carfax", "facebook")
  } },
  { id: "restaurant-food", label: "Restaurant, café or bar", social: ["instagram", "tiktok", "facebook", "youtube", "snapchat", "pinterest", "x", "linkedin"], links: {
    general: [{ type: "menu" }, { type: "order_online" }, { type: "opentable", label: "Reserve a Table" }, { type: "google_review" }, { type: "instagram" }],
    reviews: links("google_review", "tripadvisor", "facebook"),
    order: [{ type: "menu" }, { type: "order_online" }, { type: "doordash" }, { type: "uber_eats" }, { type: "grubhub" }, { type: "google_review" }]
  } },
  { id: "beauty-salon-wellness", label: "Spa, salon or wellness", social: ["instagram", "tiktok", "facebook", "pinterest", "youtube", "snapchat", "x", "linkedin"], links: {
    general: [{ type: "appointment", label: "Book Again" }, { type: "google_review" }, { type: "tip" }, { type: "gift_cards" }, { type: "instagram" }],
    // The booking apps are there for salons that use one; empty ones are left off the page.
    reviews: [...links("google_review", "facebook", "booksy", "fresha", "vagaro", "styleseat"), { type: "appointment", label: "Book Again" }]
  } },
  { id: "healthcare-dental", label: "Medical or dental practice", social: ["facebook", "instagram", "youtube", "tiktok", "linkedin", "x", "pinterest", "snapchat"], links: {
    general: [{ type: "forms", label: "Patient Forms" }, { type: "appointment", label: "Book an Appointment" }, { type: "patient_portal" }, { type: "pay_bill" }, { type: "google_review" }],
    reviews: links("google_review", "healthgrades", "vitals", "facebook")
  } },
  { id: "hotel-travel", label: "Hotel or vacation rental", social: ["instagram", "facebook", "tiktok", "youtube", "pinterest", "x", "linkedin", "snapchat"], links: {
    general: [{ type: "website", label: "Guest Guide" }, { type: "menu", label: "Room Service" }, { type: "custom_link", label: "Things to Do Nearby" }, { type: "google_review" }, { type: "tripadvisor" }],
    reviews: links("google_review", "tripadvisor", "facebook")
  } },
  { id: "home-services", label: "Home services or trades", social: ["facebook", "instagram", "youtube", "tiktok", "pinterest", "linkedin", "x", "snapchat"], links: {
    general: [{ type: "google_review" }, { type: "website", label: "Request a Quote" }, { type: "angi" }, { type: "nextdoor" }, { type: "facebook" }],
    reviews: links("google_review", "angi", "thumbtack", "nextdoor", "bbb", "facebook")
  } },
  { id: "legal", label: "Law firm", social: ["linkedin", "facebook", "instagram", "youtube", "x", "tiktok", "pinterest", "snapchat"], links: {
    general: [{ type: "appointment", label: "Book a Consultation" }, { type: "google_review" }, { type: "avvo" }, { type: "website" }, { type: "contact" }],
    reviews: links("google_review", "avvo", "martindale", "findlaw", "justia", "facebook")
  } },
  { id: "real-estate", label: "Real estate", social: ["instagram", "facebook", "youtube", "linkedin", "tiktok", "pinterest", "x", "snapchat"], links: {
    general: [{ type: "website", label: "View Listings" }, { type: "zillow" }, { type: "realtor_com" }, { type: "appointment", label: "Book a Showing" }, { type: "google_review" }],
    reviews: links("google_review", "zillow", "realtor_com", "facebook")
  } },
  { id: "retail-local-business", label: "Retail store or local shop", social: ["instagram", "facebook", "tiktok", "pinterest", "youtube", "snapchat", "x", "linkedin"], links: {
    general: [{ type: "website", label: "Shop Online" }, { type: "loyalty" }, { type: "gift_cards" }, { type: "google_review" }, { type: "instagram" }],
    reviews: links("google_review", "facebook", "nextdoor", "bbb")
  } },
  { id: "other", label: "Other", social: ["instagram", "facebook", "tiktok", "youtube", "x", "linkedin", "pinterest", "snapchat"], links: {
    general: [{ type: "website" }, { type: "google_review" }, { type: "instagram" }],
    reviews: links("google_review", "facebook")
  } }
];

export function isMultiLinkIndustry(value: unknown): value is MultiLinkIndustryId {
  return typeof value === "string" && multiLinkIndustries.some((industry) => industry.id === value);
}

/** What a stand's headline is for, from its product. */
export function multiLinkFocus(productSlug: string): Focus {
  if (productSlug === "rate-your-experience-stand") return "reviews";
  if (productSlug === "follow-us-social-media-stand") return "social";
  if (productSlug === "menu-and-order-stand") return "order";
  return "general";
}

/** The links to start a page with, for this business type and this stand. */
export function recommendedMultiLinks(industryId: MultiLinkIndustryId, productSlug: string): RecommendedLink[] {
  const industry = multiLinkIndustries.find((item) => item.id === industryId) ?? multiLinkIndustries[multiLinkIndustries.length - 1];
  const focus = multiLinkFocus(productSlug);
  if (focus === "social") return industry.social.map((type) => ({ type }));
  if (focus === "order") return industry.links.order ?? industry.links.general;
  return industry.links[focus];
}

/** The business type a stand is made for, when it is made for exactly one. */
export function defaultMultiLinkIndustry(businessUseSlugs: readonly string[] | undefined): MultiLinkIndustryId | "" {
  const uses = (businessUseSlugs ?? []).filter(isMultiLinkIndustry);
  return uses.length === 1 ? uses[0] : "";
}

/**
 * Switches a page to the recommended links. Nothing the customer typed is lost: a recommended link
 * keeps the address already entered for the same type, and any other link with an address stays
 * at the end (within the 10-link limit).
 */
export function applyRecommendedLinks<T extends { type: string; label: string; url: string }>(
  current: T[],
  recommended: RecommendedLink[],
  create: (type: HostedPageEditorButtonType, position: number) => T,
  limit = hostedPageButtonLimit,
): T[] {
  const used = new Set<T>();
  const next = recommended.map((link, position) => {
    const existing = current.find((button) => button.type === link.type && !used.has(button) && button.url.trim());
    if (existing) { used.add(existing); return { ...existing, position, ...(link.label ? { label: link.label } : {}) }; }
    const fresh = create(link.type, position);
    return link.label ? { ...fresh, label: link.label } : fresh;
  });
  const kept = current.filter((button) => !used.has(button) && button.url.trim());
  return [...next, ...kept].slice(0, limit).map((button, position) => ({ ...button, position }));
}
