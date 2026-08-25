export const emailTemplateKeys = [
  "customer-order-confirmation",
  "admin-new-order",
  "support-request",
  "shipping-tracking"
] as const;

export type EmailTemplateKey = (typeof emailTemplateKeys)[number];

export type EmailTemplateSettings = {
  key: EmailTemplateKey;
  label: string;
  description: string;
  enabled: boolean;
  subject: string;
  introText: string;
  supportText: string;
  footerText: string;
};

export const defaultEmailTemplates: Record<EmailTemplateKey, EmailTemplateSettings> = {
  "customer-order-confirmation": {
    key: "customer-order-confirmation",
    label: "Customer order confirmation",
    description: "Sent after Stripe confirms a paid checkout session.",
    enabled: true,
    subject: "Your Tap Rater order is confirmed",
    introText: "Your Tap Rater order is confirmed and marked paid.",
    supportText: "Questions? Contact Tap Rater support.",
    footerText: "Tap Rater NFC stands help local businesses connect customers to reviews, menus, bookings, feedback, social profiles, and websites."
  },
  "admin-new-order": {
    key: "admin-new-order",
    label: "Admin new paid order",
    description: "Sent to the store notification email when a paid order is ready for fulfillment review.",
    enabled: true,
    subject: "New paid Tap Rater order",
    introText: "A paid Tap Rater order is ready for fulfillment review.",
    supportText: "",
    footerText: ""
  },
  "support-request": {
    key: "support-request",
    label: "Support/contact request",
    description: "Sent to the store notification email when customers submit contact, setup, or link-change forms.",
    enabled: true,
    subject: "New Tap Rater request",
    introText: "A new Tap Rater request was submitted.",
    supportText: "",
    footerText: ""
  },
  "shipping-tracking": {
    key: "shipping-tracking",
    label: "Shipping/tracking update",
    description: "Template settings reserved for future manual shipping updates. Phase 1C does not auto-send this email.",
    enabled: true,
    subject: "Your Tap Rater order shipping update",
    introText: "Your Tap Rater order has a shipping update.",
    supportText: "Contact Tap Rater support if anything looks incorrect.",
    footerText: "Shipping timelines are reviewed by Tap Rater before fulfillment."
  }
};
