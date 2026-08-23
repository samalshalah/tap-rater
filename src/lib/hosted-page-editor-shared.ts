import type { HostedPageButtonType, HostedPageLifecycleStatus } from "@/lib/hosted-pages/snapshots";

export const hostedPageButtonLimit = 8;

export type HostedPageEditorButtonType = "google_review" | "yelp" | "facebook" | "instagram" | "website" | "appointment" | "menu" | "contact";
export type HostedPageEditorAppearance = {
  theme: "light" | "warm" | "bold";
  accentColor: "#0f766e" | "#1d4ed8" | "#7c3aed" | "#be123c";
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
  { type: "contact", label: "Contact", snapshotType: "website" }
];
