import type { HostedPageButtonType, HostedPageLifecycleStatus } from "@/lib/hosted-pages/snapshots";

export const hostedPageButtonLimit = 10;

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
  | "custom_link";
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

export const supportedHostedPageButtons: Array<{ type: HostedPageEditorButtonType; label: string; snapshotType: HostedPageButtonType }> = [
  { type: "google_review", label: "Google Review", snapshotType: "review" },
  { type: "yelp", label: "Yelp", snapshotType: "review" },
  { type: "dealerrater", label: "DealerRater", snapshotType: "review" },
  { type: "cars_com", label: "Cars.com", snapshotType: "review" },
  { type: "cargurus", label: "CarGurus", snapshotType: "review" },
  { type: "edmunds", label: "Edmunds", snapshotType: "review" },
  { type: "autotrader", label: "Autotrader", snapshotType: "review" },
  { type: "carfax", label: "Carfax", snapshotType: "review" },
  { type: "bbb", label: "BBB", snapshotType: "review" },
  { type: "facebook", label: "Facebook", snapshotType: "social" },
  { type: "instagram", label: "Instagram", snapshotType: "social" },
  { type: "youtube", label: "YouTube", snapshotType: "social" },
  { type: "tiktok", label: "TikTok", snapshotType: "social" },
  { type: "x", label: "X", snapshotType: "social" },
  { type: "linkedin", label: "LinkedIn", snapshotType: "social" },
  { type: "website", label: "Website", snapshotType: "website" },
  { type: "appointment", label: "Appointment", snapshotType: "booking" },
  { type: "menu", label: "Menu", snapshotType: "menu" },
  { type: "contact", label: "Contact", snapshotType: "website" },
  { type: "whatsapp", label: "WhatsApp", snapshotType: "social" },
  { type: "custom_link", label: "Custom Link", snapshotType: "website" }
];

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
    bbb: { text: "BBB", icon: "text", brand: "BBB", background: "#005a78", color: "#ffffff", border: "#005a78" },
    youtube: { logo: "/brand/multilink/youtube.png", text: "\u25B6", icon: "youtube", brand: "YouTube", background: "#ff0000", color: "#ffffff", border: "#ff0000" },
    tiktok: { logo: "/brand/multilink/tiktok.png", text: "TikTok", icon: "tiktok", brand: "TikTok", background: "#000000", color: "#ffffff", border: "#000000" },
    x: { logo: "/brand/multilink/x.png", text: "X", icon: "text", brand: "X", background: "#000000", color: "#ffffff", border: "#000000" },
    linkedin: { logo: "/brand/multilink/linkedin.png", text: "in", icon: "text", brand: "LinkedIn", background: "#0a66c2", color: "#ffffff", border: "#0a66c2" },
    custom_link: { text: "Link", icon: "link", brand: "Custom link", background: "#ffffff", color: "#17211f", border: "#dfe7e3" },
    review: { logo: "/brand/multilink/google.png", text: "G", icon: "google", brand: "Review", background: "#ffffff", color: "#4285f4", border: "#dadce0" },
    social: { logo: "/brand/multilink/facebook.png", text: "f", icon: "facebook", brand: "Social", background: "#1877f2", color: "#ffffff", border: "#1877f2" },
    booking: { text: "Cal", icon: "calendar", brand: "Booking", background: "#0f766e", color: "#ffffff", border: "#0f766e" },
    custom: { text: "Link", icon: "link", brand: "Custom link", background: "#ffffff", color: "#17211f", border: "#dfe7e3" }
  };

  return marks[type] ?? marks.custom_link;
}
