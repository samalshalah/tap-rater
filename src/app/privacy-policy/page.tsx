import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Tap Rater handles contact details, order information, destination links, uploaded logos, support requests, and payment processing."
};

const sections = [
  {
    title: "Information we collect",
    body: [
      "Tap Rater collects the information needed to sell, customize, support, and fulfill NFC stand orders. This may include your name, email address, business name, destination link, shipping or order details, uploaded logo files, design notes, and support request details.",
      "For Branded + QR orders, we collect the business name, destination URL, logo file, generated QR value, and proof confirmation details needed to prepare the printed stand."
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
      "We use order and setup information to process checkout, generate QR proofs, prepare production details, answer support requests, update destination links, and communicate about your order.",
      "We may review uploaded content to confirm it is appropriate for production and compatible with the selected stand option."
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
    <PolicyPage eyebrow="Privacy Policy" title="How Tap Rater handles customer and order information." intro="This page summarizes the practical information Tap Rater collects to operate the storefront, support customers, and prepare printed NFC stand orders." sections={sections} />
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
    <main className="bg-white text-ink">
      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-brand">{eyebrow}</p>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight text-ink md:text-5xl">{title}</h1>
          <p className="mt-4 text-base leading-7 text-muted">{intro}</p>
        </div>
      </section>

      <section className="bg-[#f7f8fa]">
        <div className="mx-auto grid max-w-4xl gap-4 px-4 py-10 sm:px-6 lg:px-8">
          {sections.map((section) => (
            <article key={section.title} className="rounded-[18px] border border-line bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-ink">{section.title}</h2>
              <div className="mt-3 grid gap-3 text-sm leading-6 text-muted">
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </article>
          ))}
          <div className="rounded-[18px] border border-line bg-white p-5">
            <p className="text-sm leading-6 text-muted">
              Need help? <Link href="/support" className="font-black text-brand">Contact Tap Rater support</Link>.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
