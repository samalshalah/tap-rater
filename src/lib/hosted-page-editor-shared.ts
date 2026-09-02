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
  | "custom_link";
export type HostedPageEditorAppearance = {
  theme: "light" | "warm" | "bold";
  accentColor: "#0f766e" | "#1d4ed8" | "#7c3aed" | "#be123c" | "#e5e7eb" | "#6b7280";
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
  publishedVersion?: string;
  publishedAt?: string;
  updatedAt?: string;
};

export const supportedHostedPageButtons: Array<{ type: HostedPageEditorButtonType; label: string; snapshotType: HostedPageButtonType }> = [
  { type: "google_review", label: "Google Review", snapshotType: "review" },
  { type: "yelp", label: "Yelp", snapshotType: "review" },
  { type: "facebook", label: "Facebook", snapshotType: "social" },
  { type: "instagram", label: "Instagram", snapshotType: "social" },
  { type: "website", label: "Website", snapshotType: "website" },
  { type: "appointment", label: "Appointment", snapshotType: "booking" },
  { type: "menu", label: "Menu", snapshotType: "menu" },
  { type: "contact", label: "Contact", snapshotType: "website" },
  { type: "whatsapp", label: "WhatsApp", snapshotType: "social" },
  { type: "custom_link", label: "Custom Link", snapshotType: "website" }
];

export function getHostedButtonMark(type: HostedPageEditorButtonType | string) {
  const marks: Record<string, { text: string; icon: string; brand: string; background: string; color: string; border: string }> = {
    google_review: { text: "G", icon: "google", brand: "Google", background: "#ffffff", color: "#4285f4", border: "#dadce0" },
    yelp: { text: "Yelp", icon: "yelp", brand: "Yelp", background: "#d32323", color: "#ffffff", border: "#d32323" },
    facebook: { text: "f", icon: "facebook", brand: "Facebook", background: "#1877f2", color: "#ffffff", border: "#1877f2" },
    instagram: { text: "Instagram", icon: "instagram", brand: "Instagram", background: "#ffffff", color: "#e4405f", border: "#f4c6d1" },
    website: { text: "WWW", icon: "website", brand: "Website", background: "#111827", color: "#ffffff", border: "#111827" },
    appointment: { text: "Cal", icon: "calendar", brand: "Appointment", background: "#0f766e", color: "#ffffff", border: "#0f766e" },
    menu: { text: "Menu", icon: "menu", brand: "Menu", background: "#f97316", color: "#ffffff", border: "#f97316" },
    contact: { text: "@", icon: "contact", brand: "Contact", background: "#334155", color: "#ffffff", border: "#334155" },
    whatsapp: { text: "WhatsApp", icon: "whatsapp", brand: "WhatsApp", background: "#25d366", color: "#0b1f14", border: "#25d366" },
    custom_link: { text: "Link", icon: "link", brand: "Custom link", background: "#ffffff", color: "#17211f", border: "#dfe7e3" },
    review: { text: "G", icon: "google", brand: "Review", background: "#ffffff", color: "#4285f4", border: "#dadce0" },
    social: { text: "f", icon: "facebook", brand: "Social", background: "#1877f2", color: "#ffffff", border: "#1877f2" },
    booking: { text: "Cal", icon: "calendar", brand: "Booking", background: "#0f766e", color: "#ffffff", border: "#0f766e" },
    custom: { text: "Link", icon: "link", brand: "Custom link", background: "#ffffff", color: "#17211f", border: "#dfe7e3" }
  };

  return marks[type] ?? marks.custom_link;
}
