import Link from "next/link";
import type { Metadata } from "next";
import { PageHero, SectionShell } from "@/components/storefront/section";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Tap Rater handles contact details, order information, destination links, uploaded logos, support requests, and payment processing.",
  alternates: { canonical: "/privacy-policy" },
};

const sections = [
  {
    title: "Information we collect",
    body: [
      "Tap Rater collects the information needed to sell, customize, support, and fulfill NFC stand orders. This may include your name, email address, business name, destination link, shipping or order details, uploaded logo files, design notes, and support request details.",
      "For Branded + QR orders, we collect the business name, destination URL, logo file, and generated QR value needed to prepare the stand.",
    ],
  },
  {
    title: "Address suggestions",
    body: [
      "When you type a shipping street address, the typed address text is sent to Google Maps Platform to suggest matching U.S. addresses. Selecting a suggestion fills the shipping fields; you can review and edit them before placing an order. You can also enter an address manually.",
    ],
  },
  {
    title: "Payments",
    body: [
      "Payments are processed by Stripe. Tap Rater does not store full card numbers in the website database. Stripe may collect and process payment information according to its own services and policies.",
    ],
  },
  {
    title: "How we use information",
    body: [
      "We use order and setup information to process checkout, generate QR codes, prepare order details, answer support requests, update destination links, and communicate about your order.",
      "We may review uploaded content to confirm it is appropriate and compatible with the selected stand option.",
    ],
  },
  {
    title: "Files and destination links",
    body: [
      "Uploaded logos and related setup files may be stored so Tap Rater can review and fulfill the order. Destination links are used to program NFC behavior, generate QR codes when selected, and support future link-change requests.",
    ],
  },
  {
    title: "Form security",
    body: [
      "Contact, setup, and link-change forms use Cloudflare Turnstile to help prevent automated spam and abuse. Cloudflare processes browser and device signals for this security check; our server sends the verification token and, when available, your IP address to Cloudflare to validate the submission. We do not send the contents of your support message or uploaded artwork to Turnstile.",
    ],
  },
  {
    title: "Analytics",
    body: [
      "When enabled, optional Google Analytics runs only after you accept analytics. It measures public storefront visits, product selections, cart activity, checkout steps, and confirmed purchases. With your analytics consent, we also keep session-level journey reports in our own database for up to 90 days, using approved campaign labels, public page paths, device categories, and product identifiers. Rejecting analytics does not prevent shopping or checkout. We do not enable advertising personalization or Google Signals.",
      "Analytics may use browser identifiers, device information, product identifiers, quantities, prices, and an internal order identifier. We do not intentionally send customer names, email addresses, phone numbers, shipping addresses, uploaded files, destination links, or checkout session identifiers to Google Analytics. Account, admin, and customer-hosted pages are excluded from our analytics events. For consented, attributable purchases, our server sends the verified purchase to Google even if you close the confirmation page. Google processes analytics data under its own privacy policy.",
      "Use Analytics preferences in the footer to change your choice. Rejecting analytics stops future collection and clears our Google Analytics cookies on this browser; it does not erase data previously collected. We also respect the Global Privacy Control browser signal by keeping optional analytics off. Your choice is stored for up to 180 days. Essential cart, account, payment, and security storage is separate from optional analytics.",
    ],
  },
  {
    title: "Google Customer Reviews",
    body: [
      "After a confirmed purchase, we share your order identifier, email address, delivery country, and estimated delivery date with Google to display the Google Customer Reviews survey invitation. Google sends a survey email only if you choose to participate in its invitation. This choice is separate from analytics consent and is not required to complete your purchase.",
      "Google and other third parties may use cookies, web beacons, or similar technologies to provide this program. You can block or remove cookies through your browser settings, although doing so may prevent the invitation from working. Google processes this information under the Google Privacy Policy at https://policies.google.com/privacy.",
    ],
  },
  {
    title: "Contact us",
    body: [
      "For privacy or support questions, contact Tap Rater through the support page.",
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <PolicyPage
      eyebrow="Privacy Policy"
      title="How Tap Rater handles customer and order information."
      intro="This page summarizes the practical information Tap Rater collects to operate the storefront, support customers, and prepare NFC stand orders."
      sections={sections}
    />
  );
}

function PolicyPage({
  eyebrow,
  title,
  intro,
  sections,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  sections: { title: string; body: string[] }[];
}) {
  return (
    <main className="tr-public-shell text-ink">
      <PageHero eyebrow={eyebrow} title={title} body={intro} />

      <SectionShell tone="soft" spacing="compact">
        <div className="tr-container-narrow grid gap-4">
          {sections.map((section) => (
            <article key={section.title} className="tr-card p-5">
              <h2 className="tr-card-title">{section.title}</h2>
              <div className="tr-body-sm mt-3 grid gap-3">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </article>
          ))}
          <div className="tr-card p-5">
            <p className="tr-body-sm mb-3">
              Form security uses Cloudflare Turnstile. See the{" "}
              <a
                href="https://www.cloudflare.com/privacypolicy/"
                className="font-semibold text-brand hover:text-brand-dark"
              >
                Cloudflare Privacy Policy
              </a>
              .
            </p>
            <p className="tr-body-sm mb-3">
              Address suggestions use Google Maps Platform and are subject to
              the{" "}
              <a
                href="https://policies.google.com/privacy"
                className="font-semibold text-brand hover:text-brand-dark"
              >
                Google Privacy Policy
              </a>
              .
            </p>
            <p className="tr-body-sm">
              Need help?{" "}
              <Link
                href="/support"
                className="font-semibold text-brand hover:text-brand-dark"
              >
                Contact Tap Rater support
              </Link>
              .
            </p>
          </div>
        </div>
      </SectionShell>
    </main>
  );
}
