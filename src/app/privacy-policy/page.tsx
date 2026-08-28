import Link from "next/link";
import type { Metadata } from "next";
import { SectionShell } from "@/components/storefront/section";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Tap Rater handles contact details, order information, destination links, uploaded logos, support requests, and payment processing."
};

const sections = [
  {
    title: "Information we collect",
    body: [
      "Tap Rater collects the information needed to sell, customize, support, and fulfill NFC stand orders. This may include your name, email address, business name, destination link, shipping or order details, uploaded logo files, design notes, and support request details.",
      "For Branded + QR orders, we collect the business name, destination URL, logo file, generated QR value, and proof confirmation details needed to prepare the stand."
    ]
  },
  {
    title: "Payments",
    body: [
      "Payments are processed by Stripe. Tap Rater does not store full card numbers in the website database. Stripe may collect and process payment information according to its own services and policies."
    ]
  },
  {
    title: "How we use information",
    body: [
      "We use order and setup information to process checkout, generate QR proofs, prepare order details, answer support requests, update destination links, and communicate about your order.",
      "We may review uploaded content to confirm it is appropriate and compatible with the selected stand option."
    ]
  },
  {
    title: "Files and destination links",
    body: [
      "Uploaded logos and related setup files may be stored so Tap Rater can review and fulfill the order. Destination links are used to program NFC behavior, generate QR codes when selected, and support future link-change requests."
    ]
  },
  {
    title: "Analytics",
    body: [
      "Tap Rater may use basic website, device, and order analytics to understand site performance, product interest, and support needs. Analytics should not be used as a guarantee of future reviews, bookings, followers, or sales."
    ]
  },
  {
    title: "Contact us",
    body: ["For privacy or support questions, contact Tap Rater through the support page."]
  }
];

export default function PrivacyPolicyPage() {
  return (
    <PolicyPage eyebrow="Privacy Policy" title="How Tap Rater handles customer and order information." intro="This page summarizes the practical information Tap Rater collects to operate the storefront, support customers, and prepare NFC stand orders." sections={sections} />
  );
}

function PolicyPage({
  eyebrow,
  title,
  intro,
  sections
}: {
  eyebrow: string;
  title: string;
  intro: string;
  sections: { title: string; body: string[] }[];
}) {
  return (
    <main className="tr-public-shell text-ink">
      <SectionShell spacing="compact">
        <div className="tr-container-narrow">
          <p className="tr-eyebrow">{eyebrow}</p>
          <h1 className="tr-page-title mt-4">{title}</h1>
          <p className="tr-body mt-4">{intro}</p>
        </div>
      </SectionShell>

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
            <p className="tr-body-sm">
              Need help? <Link href="/support" className="font-semibold text-brand hover:text-brand-dark">Contact Tap Rater support</Link>.
            </p>
          </div>
        </div>
      </SectionShell>
    </main>
  );
}
