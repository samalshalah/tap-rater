import type { HostedPageButtonType, HostedPageLifecycleStatus } from "@/lib/hosted-pages/snapshots";

/** Links a Multi-Link page can have; the customer chooses how many (Nov 2026: raised from 10). */
export const hostedPageButtonLimit = 20;

export type HostedPageEditorButtonType =
  | "google_review"
  | "yelp"
  | "facebook"
  | "instagram"
  | "website"
  | "appointment"
  | "menu"
  | "contact"
  | "whatsapp"
  | "dealerrater"
  | "cars_com"
  | "cargurus"
  | "edmunds"
  | "autotrader"
  | "carfax"
  | "bbb"
  | "youtube"
  | "tiktok"
  | "x"
  | "linkedin"
  | "pinterest"
  | "snapchat"
  | "martindale"
  | "findlaw"
  | "ratemds"
  | "opencare"
  | "homes_com"
  | "order_online"
  | "doordash"
  | "uber_eats"
  | "grubhub"
  | "opentable"
  | "resy"
  | "fresha"
  | "booksy"
  | "vagaro"
  | "styleseat"
  | "mindbody"
  | "zocdoc"
  | "booking_com"
  | "expedia"
  | "airbnb"
  | "hotels_com"
  | "vrbo"
  | "trip_com"
  | "trustpilot"
  | "shopper_approved"
  | "tripadvisor"
  | "healthgrades"
  | "vitals"
  | "avvo"
  | "justia"
  | "angi"
  | "thumbtack"
  | "homeadvisor"
  | "nextdoor"
  | "houzz"
  | "zillow"
  | "realtor_com"
  | "tip"
  | "pay_bill"
  | "venmo"
  | "cash_app"
  | "gift_cards"
  | "loyalty"
  | "forms"
  | "patient_portal"
  | "custom_link";

/** How the link picker groups link types. */
export type HostedButtonCategory = "review" | "order" | "booking" | "social" | "pay" | "info";
export const hostedButtonCategories: { id: HostedButtonCategory; label: string }[] = [
  { id: "review", label: "Reviews" },
  { id: "order", label: "Order & delivery" },
  { id: "booking", label: "Booking" },
  { id: "social", label: "Social" },
  { id: "pay", label: "Payments, tips & gifts" },
  { id: "info", label: "Info & other" }
];
// Car-brand (OEM) colours for the button outline. Buttons are always very light gray.
export const hostedPageBrandColors = [
  { value: "#6b7280", label: "Neutral gray" },
  { value: "#eb0a1e", label: "Toyota" },
  { value: "#1a1a1a", label: "Lexus, Mercedes-Benz, Mazda (black)" },
  { value: "#cc0000", label: "Honda, GMC" },
  { value: "#003478", label: "Ford" },
  { value: "#cd9834", label: "Chevrolet" },
  { value: "#c3002f", label: "Nissan" },
  { value: "#002c5f", label: "Hyundai" },
  { value: "#05141f", label: "Kia" },
  { value: "#013c74", label: "Subaru" },
  { value: "#001e50", label: "Volkswagen" },
  { value: "#1c69d4", label: "BMW" },
  { value: "#bb0a30", label: "Audi" },
  { value: "#e60012", label: "Mitsubishi" },
  { value: "#003057", label: "Volvo" }
] as const;
// Earlier accent choices stay valid so existing pages keep working.
export const hostedPageLegacyAccentColors = ["#0f766e", "#1d4ed8", "#7c3aed", "#be123c", "#e5e7eb"] as const;
export type HostedPageAccentColor = (typeof hostedPageBrandColors)[number]["value"] | (typeof hostedPageLegacyAccentColors)[number];
export type HostedPageEditorAppearance = {
  theme: "light" | "warm" | "bold";
  accentColor: HostedPageAccentColor;
  logoAlign?: "left" | "center" | "right";
  textAlign?: "left" | "center" | "right";
};
export type HostedPageEditorButton = {
  id: string;
  type: HostedPageEditorButtonType;
  label: string;
  url: string;
  enabled: boolean;
  position: number;
};
export type HostedPageEditorDraft = {
  businessName: string;
  /** false = leave the business name off the page (shown by default). */
  showBusinessName?: boolean;
  logoUrl?: string;
  headline?: string;
  description?: string;
  appearance: HostedPageEditorAppearance;
  buttons: HostedPageEditorButton[];
};
export type HostedPageEditorRecord = {
  id: string;
  customerId: string;
  customerEmail: string;
  businessId: string;
  businessName: string;
  code: string;
  lifecycleStatus: HostedPageLifecycleStatus;
  draft: HostedPageEditorDraft;
  draftVersion?: number;
  publishedVersion?: string;
  publishedAt?: string;
  updatedAt?: string;
};

export const supportedHostedPageButtons: Array<{ type: HostedPageEditorButtonType; label: string; snapshotType: HostedPageButtonType; category: HostedButtonCategory }> = [
  { type: "google_review", label: "Google Review", snapshotType: "review", category: "review" },
  { type: "yelp", label: "Yelp", snapshotType: "review", category: "review" },
  { type: "dealerrater", label: "DealerRater", snapshotType: "review", category: "review" },
  { type: "cars_com", label: "Cars.com", snapshotType: "review", category: "review" },
  { type: "cargurus", label: "CarGurus", snapshotType: "review", category: "review" },
  { type: "edmunds", label: "Edmunds", snapshotType: "review", category: "review" },
  { type: "autotrader", label: "Autotrader", snapshotType: "review", category: "review" },
  { type: "carfax", label: "Carfax", snapshotType: "review", category: "review" },
  { type: "bbb", label: "BBB", snapshotType: "review", category: "review" },
  { type: "facebook", label: "Facebook", snapshotType: "social", category: "social" },
  { type: "instagram", label: "Instagram", snapshotType: "social", category: "social" },
  { type: "youtube", label: "YouTube", snapshotType: "social", category: "social" },
  { type: "tiktok", label: "TikTok", snapshotType: "social", category: "social" },
  { type: "x", label: "X", snapshotType: "social", category: "social" },
  { type: "linkedin", label: "LinkedIn", snapshotType: "social", category: "social" },
  { type: "pinterest", label: "Pinterest", snapshotType: "social", category: "social" },
  { type: "snapchat", label: "Snapchat", snapshotType: "social", category: "social" },
  { type: "website", label: "Website", snapshotType: "website", category: "info" },
  { type: "appointment", label: "Appointment", snapshotType: "booking", category: "booking" },
  { type: "menu", label: "Menu", snapshotType: "menu", category: "order" },
  { type: "contact", label: "Contact", snapshotType: "website", category: "info" },
  { type: "whatsapp", label: "WhatsApp", snapshotType: "social", category: "social" },
  { type: "order_online", label: "Order Online", snapshotType: "order", category: "order" },
  { type: "doordash", label: "DoorDash", snapshotType: "order", category: "order" },
  { type: "uber_eats", label: "Uber Eats", snapshotType: "order", category: "order" },
  { type: "grubhub", label: "Grubhub", snapshotType: "order", category: "order" },
  { type: "opentable", label: "OpenTable", snapshotType: "booking", category: "booking" },
  { type: "resy", label: "Resy", snapshotType: "booking", category: "booking" },
  { type: "fresha", label: "Fresha", snapshotType: "booking", category: "booking" },
  { type: "booksy", label: "Booksy", snapshotType: "booking", category: "booking" },
  { type: "vagaro", label: "Vagaro", snapshotType: "booking", category: "booking" },
  { type: "styleseat", label: "StyleSeat", snapshotType: "booking", category: "booking" },
  { type: "mindbody", label: "Mindbody", snapshotType: "booking", category: "booking" },
  { type: "zocdoc", label: "Zocdoc", snapshotType: "booking", category: "booking" },
  { type: "booking_com", label: "Booking.com", snapshotType: "review", category: "booking" },
  { type: "expedia", label: "Expedia", snapshotType: "review", category: "booking" },
  { type: "airbnb", label: "Airbnb", snapshotType: "review", category: "booking" },
  { type: "hotels_com", label: "Hotels.com", snapshotType: "review", category: "booking" },
  { type: "vrbo", label: "Vrbo", snapshotType: "review", category: "booking" },
  { type: "trip_com", label: "Trip.com", snapshotType: "review", category: "booking" },
  { type: "tripadvisor", label: "Tripadvisor", snapshotType: "review", category: "review" },
  { type: "trustpilot", label: "Trustpilot", snapshotType: "review", category: "review" },
  { type: "shopper_approved", label: "Shopper Approved", snapshotType: "review", category: "review" },
  { type: "healthgrades", label: "Healthgrades", snapshotType: "review", category: "review" },
  { type: "vitals", label: "Vitals", snapshotType: "review", category: "review" },
  { type: "ratemds", label: "RateMDs", snapshotType: "review", category: "review" },
  { type: "opencare", label: "Opencare", snapshotType: "review", category: "review" },
  { type: "avvo", label: "Avvo", snapshotType: "review", category: "review" },
  { type: "justia", label: "Justia", snapshotType: "review", category: "review" },
  { type: "martindale", label: "Martindale / Lawyers.com", snapshotType: "review", category: "review" },
  { type: "findlaw", label: "FindLaw", snapshotType: "review", category: "review" },
  { type: "angi", label: "Angi", snapshotType: "review", category: "review" },
  { type: "thumbtack", label: "Thumbtack", snapshotType: "review", category: "review" },
  { type: "homeadvisor", label: "HomeAdvisor", snapshotType: "review", category: "review" },
  { type: "nextdoor", label: "Nextdoor", snapshotType: "review", category: "review" },
  { type: "houzz", label: "Houzz", snapshotType: "review", category: "review" },
  { type: "zillow", label: "Zillow", snapshotType: "review", category: "review" },
  { type: "realtor_com", label: "Realtor.com", snapshotType: "review", category: "review" },
  { type: "homes_com", label: "Homes.com", snapshotType: "review", category: "review" },
  { type: "tip", label: "Leave a Tip", snapshotType: "payment", category: "pay" },
  { type: "pay_bill", label: "Pay Your Bill", snapshotType: "payment", category: "pay" },
  { type: "venmo", label: "Venmo", snapshotType: "payment", category: "pay" },
  { type: "cash_app", label: "Cash App", snapshotType: "payment", category: "pay" },
  { type: "gift_cards", label: "Gift Cards", snapshotType: "payment", category: "pay" },
  { type: "loyalty", label: "Rewards", snapshotType: "loyalty", category: "pay" },
  { type: "forms", label: "Forms", snapshotType: "website", category: "info" },
  { type: "patient_portal", label: "Patient Portal", snapshotType: "website", category: "info" },
  { type: "custom_link", label: "Custom Link", snapshotType: "website", category: "info" }
];

/** Link types grouped for the picker, in picker order. */
export function hostedButtonGroups() {
  return hostedButtonCategories.map((category) => ({ ...category, options: supportedHostedPageButtons.filter((button) => button.category === category.id) }));
}

export function getHostedButtonMark(type: HostedPageEditorButtonType | string) {
  // logo: the brand's official app icon (square, same size for every brand), served from /public/brand/multilink.
  const marks: Record<string, { text: string; icon: string; brand: string; background: string; color: string; border: string; logo?: string }> = {
    google_review: { logo: "/brand/multilink/google.png", text: "G", icon: "google", brand: "Google", background: "#ffffff", color: "#4285f4", border: "#dadce0" },
    yelp: { logo: "/brand/multilink/yelp.png", text: "Yelp", icon: "yelp", brand: "Yelp", background: "#d32323", color: "#ffffff", border: "#d32323" },
    facebook: { logo: "/brand/multilink/facebook.png", text: "f", icon: "facebook", brand: "Facebook", background: "#1877f2", color: "#ffffff", border: "#1877f2" },
    instagram: { logo: "/brand/multilink/instagram.png", text: "Instagram", icon: "instagram", brand: "Instagram", background: "#ffffff", color: "#e4405f", border: "#f4c6d1" },
    website: { text: "WWW", icon: "website", brand: "Website", background: "#111827", color: "#ffffff", border: "#111827" },
    appointment: { text: "Cal", icon: "calendar", brand: "Appointment", background: "#ffffff", color: "#0f766e", border: "#dfe7e3" },
    menu: { text: "Menu", icon: "menu", brand: "Menu", background: "#f97316", color: "#ffffff", border: "#f97316" },
    contact: { text: "@", icon: "contact", brand: "Contact", background: "#334155", color: "#ffffff", border: "#334155" },
    whatsapp: { logo: "/brand/multilink/whatsapp.png", text: "WhatsApp", icon: "whatsapp", brand: "WhatsApp", background: "#25d366", color: "#0b1f14", border: "#25d366" },
    dealerrater: { logo: "/brand/multilink/dealerrater.png", text: "DR", icon: "text", brand: "DealerRater", background: "#f36f21", color: "#ffffff", border: "#f36f21" },
    cars_com: { logo: "/brand/multilink/cars-com.png", text: "cars", icon: "text", brand: "Cars.com", background: "#5b2c86", color: "#ffffff", border: "#5b2c86" },
    cargurus: { logo: "/brand/multilink/cargurus.png", text: "CG", icon: "text", brand: "CarGurus", background: "#00a0dd", color: "#ffffff", border: "#00a0dd" },
    edmunds: { logo: "/brand/multilink/edmunds.png", text: "E", icon: "text", brand: "Edmunds", background: "#0069bf", color: "#ffffff", border: "#0069bf" },
    autotrader: { logo: "/brand/multilink/autotrader.png", text: "AT", icon: "text", brand: "Autotrader", background: "#f15a24", color: "#ffffff", border: "#f15a24" },
    carfax: { logo: "/brand/multilink/carfax.png", text: "CFX", icon: "text", brand: "Carfax", background: "#ffffff", color: "#111111", border: "#111111" },
    bbb: { logo: "/brand/multilink/bbb.png", text: "BBB", icon: "text", brand: "BBB", background: "#005a78", color: "#ffffff", border: "#005a78" },
    youtube: { logo: "/brand/multilink/youtube.png", text: "\u25B6", icon: "youtube", brand: "YouTube", background: "#ff0000", color: "#ffffff", border: "#ff0000" },
    tiktok: { logo: "/brand/multilink/tiktok.png", text: "TikTok", icon: "tiktok", brand: "TikTok", background: "#000000", color: "#ffffff", border: "#000000" },
    x: { logo: "/brand/multilink/x.png", text: "X", icon: "text", brand: "X", background: "#000000", color: "#ffffff", border: "#000000" },
    linkedin: { logo: "/brand/multilink/linkedin.png", text: "in", icon: "text", brand: "LinkedIn", background: "#0a66c2", color: "#ffffff", border: "#0a66c2" },
    pinterest: { logo: "/brand/multilink/pinterest.png", text: "P", icon: "text", brand: "Pinterest", background: "#e60023", color: "#ffffff", border: "#e60023" },
    snapchat: { logo: "/brand/multilink/snapchat.png", text: "S", icon: "text", brand: "Snapchat", background: "#fffc00", color: "#111111", border: "#e2df00" },
    custom_link: { text: "Link", icon: "link", brand: "Custom link", background: "#ffffff", color: "#17211f", border: "#dfe7e3" },
    order_online: { text: "Order", icon: "order", brand: "Order Online", background: "#111827", color: "#ffffff", border: "#111827" },
    doordash: { logo: "/brand/multilink/doordash.png", text: "DD", icon: "text", brand: "DoorDash", background: "#ff3008", color: "#ffffff", border: "#ff3008" },
    uber_eats: { logo: "/brand/multilink/uber-eats.png", text: "UE", icon: "text", brand: "Uber Eats", background: "#06c167", color: "#000000", border: "#06c167" },
    grubhub: { logo: "/brand/multilink/grubhub.png", text: "GH", icon: "text", brand: "Grubhub", background: "#f63440", color: "#ffffff", border: "#f63440" },
    opentable: { logo: "/brand/multilink/opentable.png", text: "OT", icon: "text", brand: "OpenTable", background: "#da3743", color: "#ffffff", border: "#da3743" },
    resy: { text: "Resy", icon: "text", brand: "Resy", background: "#ff462d", color: "#ffffff", border: "#ff462d" },
    fresha: { logo: "/brand/multilink/fresha.png", text: "F", icon: "text", brand: "Fresha", background: "#000000", color: "#ffffff", border: "#000000" },
    booksy: { logo: "/brand/multilink/booksy.png", text: "B", icon: "text", brand: "Booksy", background: "#00a3ad", color: "#ffffff", border: "#00a3ad" },
    vagaro: { logo: "/brand/multilink/vagaro.png", text: "V", icon: "text", brand: "Vagaro", background: "#e1251b", color: "#ffffff", border: "#e1251b" },
    styleseat: { logo: "/brand/multilink/styleseat.png", text: "SS", icon: "text", brand: "StyleSeat", background: "#000000", color: "#ffffff", border: "#000000" },
    mindbody: { logo: "/brand/multilink/mindbody.png", text: "MB", icon: "text", brand: "Mindbody", background: "#f26f21", color: "#ffffff", border: "#f26f21" },
    zocdoc: { logo: "/brand/multilink/zocdoc.png", text: "Zd", icon: "text", brand: "Zocdoc", background: "#fff200", color: "#000000", border: "#fff200" },
    booking_com: { logo: "/brand/multilink/booking-com.png", text: "B.", icon: "text", brand: "Booking.com", background: "#003580", color: "#ffffff", border: "#003580" },
    expedia: { logo: "/brand/multilink/expedia.png", text: "Ex", icon: "text", brand: "Expedia", background: "#191e3b", color: "#ffd500", border: "#191e3b" },
    airbnb: { logo: "/brand/multilink/airbnb.png", text: "Air", icon: "text", brand: "Airbnb", background: "#ff385c", color: "#ffffff", border: "#ff385c" },
    hotels_com: { logo: "/brand/multilink/hotels-com.png", text: "H", icon: "text", brand: "Hotels.com", background: "#d32f2f", color: "#ffffff", border: "#d32f2f" },
    vrbo: { logo: "/brand/multilink/vrbo.png", text: "V", icon: "text", brand: "Vrbo", background: "#245abc", color: "#ffffff", border: "#245abc" },
    trip_com: { logo: "/brand/multilink/trip-com.png", text: "T", icon: "text", brand: "Trip.com", background: "#287dfa", color: "#ffffff", border: "#287dfa" },
    tripadvisor: { logo: "/brand/multilink/tripadvisor.png", text: "TA", icon: "text", brand: "Tripadvisor", background: "#34e0a1", color: "#000000", border: "#34e0a1" },
    trustpilot: { logo: "/brand/multilink/trustpilot.png", text: "★", icon: "text", brand: "Trustpilot", background: "#00b67a", color: "#ffffff", border: "#00b67a" },
    shopper_approved: { logo: "/brand/multilink/shopper-approved.png", text: "SA", icon: "text", brand: "Shopper Approved", background: "#2c6db5", color: "#ffffff", border: "#2c6db5" },
    healthgrades: { logo: "/brand/multilink/healthgrades.png", text: "HG", icon: "text", brand: "Healthgrades", background: "#0d6c9e", color: "#ffffff", border: "#0d6c9e" },
    vitals: { logo: "/brand/multilink/vitals.png", text: "V", icon: "text", brand: "Vitals", background: "#00a1df", color: "#ffffff", border: "#00a1df" },
    ratemds: { logo: "/brand/multilink/ratemds.png", text: "RM", icon: "text", brand: "RateMDs", background: "#0a7cc2", color: "#ffffff", border: "#0a7cc2" },
    opencare: { logo: "/brand/multilink/opencare.png", text: "O", icon: "text", brand: "Opencare", background: "#1e9e8f", color: "#ffffff", border: "#1e9e8f" },
    avvo: { logo: "/brand/multilink/avvo.png", text: "Avvo", icon: "text", brand: "Avvo", background: "#00467f", color: "#ffffff", border: "#00467f" },
    justia: { logo: "/brand/multilink/justia.png", text: "J", icon: "text", brand: "Justia", background: "#1d4f91", color: "#ffffff", border: "#1d4f91" },
    martindale: { logo: "/brand/multilink/martindale.png", text: "M", icon: "text", brand: "Martindale / Lawyers.com", background: "#1b365d", color: "#ffffff", border: "#1b365d" },
    findlaw: { logo: "/brand/multilink/findlaw.png", text: "FL", icon: "text", brand: "FindLaw", background: "#00467f", color: "#ffffff", border: "#00467f" },
    angi: { logo: "/brand/multilink/angi.png", text: "Angi", icon: "text", brand: "Angi", background: "#ff6153", color: "#ffffff", border: "#ff6153" },
    thumbtack: { logo: "/brand/multilink/thumbtack.png", text: "TT", icon: "text", brand: "Thumbtack", background: "#009fd9", color: "#ffffff", border: "#009fd9" },
    homeadvisor: { logo: "/brand/multilink/homeadvisor.png", text: "HA", icon: "text", brand: "HomeAdvisor", background: "#f68315", color: "#ffffff", border: "#f68315" },
    nextdoor: { logo: "/brand/multilink/nextdoor.png", text: "N", icon: "text", brand: "Nextdoor", background: "#8ed500", color: "#000000", border: "#8ed500" },
    houzz: { logo: "/brand/multilink/houzz.png", text: "H", icon: "text", brand: "Houzz", background: "#4dbc15", color: "#ffffff", border: "#4dbc15" },
    zillow: { logo: "/brand/multilink/zillow.png", text: "Z", icon: "text", brand: "Zillow", background: "#006aff", color: "#ffffff", border: "#006aff" },
    realtor_com: { logo: "/brand/multilink/realtor-com.png", text: "R", icon: "text", brand: "Realtor.com", background: "#d92228", color: "#ffffff", border: "#d92228" },
    homes_com: { logo: "/brand/multilink/homes-com.png", text: "H", icon: "text", brand: "Homes.com", background: "#e8562a", color: "#ffffff", border: "#e8562a" },
    tip: { text: "Tip", icon: "pay", brand: "Leave a Tip", background: "#0f766e", color: "#ffffff", border: "#0f766e" },
    pay_bill: { text: "Pay", icon: "pay", brand: "Pay Your Bill", background: "#0f766e", color: "#ffffff", border: "#0f766e" },
    venmo: { text: "V", icon: "text", brand: "Venmo", background: "#008cff", color: "#ffffff", border: "#008cff" },
    cash_app: { text: "$", icon: "text", brand: "Cash App", background: "#00d64f", color: "#ffffff", border: "#00d64f" },
    gift_cards: { text: "Gift", icon: "gift", brand: "Gift Cards", background: "#be123c", color: "#ffffff", border: "#be123c" },
    loyalty: { text: "Rwd", icon: "gift", brand: "Rewards", background: "#7c3aed", color: "#ffffff", border: "#7c3aed" },
    forms: { text: "Form", icon: "contact", brand: "Forms", background: "#334155", color: "#ffffff", border: "#334155" },
    patient_portal: { text: "Portal", icon: "website", brand: "Patient Portal", background: "#1d4ed8", color: "#ffffff", border: "#1d4ed8" },
    review: { logo: "/brand/multilink/google.png", text: "G", icon: "google", brand: "Review", background: "#ffffff", color: "#4285f4", border: "#dadce0" },
    social: { logo: "/brand/multilink/facebook.png", text: "f", icon: "facebook", brand: "Social", background: "#1877f2", color: "#ffffff", border: "#1877f2" },
    booking: { text: "Cal", icon: "calendar", brand: "Booking", background: "#0f766e", color: "#ffffff", border: "#0f766e" },
    custom: { text: "Link", icon: "link", brand: "Custom link", background: "#ffffff", color: "#17211f", border: "#dfe7e3" }
  };

  return marks[type] ?? marks.custom_link;
}
