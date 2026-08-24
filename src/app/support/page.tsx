import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tap Rater Support",
  description: "Get help with Tap Rater stand setup, custom stand requests, order questions, logo questions, and link changes."
};

const supportLinks = [
  ["Request custom work", "Ask about a custom stand, design question, bulk order, or production detail.", "/contact-us"],
  ["Change a link", "Request an update for an existing Tap Rater stand.", "/change-taprater-link"],
  ["Read FAQs", "Quick answers about setup, checkout, proofing, and production.", "/faqs"],
  ["Privacy", "How Tap Rater handles order details, uploaded logos, destination links, and support requests.", "/privacy-policy"],
  ["Terms", "Customer responsibilities for links, uploaded logos, proof approval, and product use.", "/terms"],
  ["Refunds", "Refund, cancellation, damaged item, and replacement guidance for printed stands.", "/refund-policy"],
  ["Shipping", "Production readiness, shipping estimates, and order issue support.", "/shipping"]
];

export default function SupportPage() {
  return (
    <main className="bg-white text-ink">
      <section className="border-b border-line bg-white">
        <div className="tr-container tr-section-compact">
          <p className="tr-eyebrow">Support</p>
          <h1 className="tr-page-title mt-4 max-w-3xl">Need help with a stand order?</h1>
          <p className="tr-body mt-4 max-w-2xl">
            Use support for custom stand requests, order help, logo or design questions, link setup questions, and link-change help.
          </p>
        </div>
      </section>

      <section className="bg-soft">
        <div className="tr-container grid gap-4 py-10 md:grid-cols-2 lg:grid-cols-4">
          {supportLinks.map(([title, body, href]) => (
            <Link key={title} href={href} className="tr-hover-card flex min-h-[180px] flex-col p-5">
              <h2 className="tr-card-title">{title}</h2>
              <p className="tr-body-sm mt-2">{body}</p>
              <span className="mt-auto text-sm font-black text-brand">Open</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
