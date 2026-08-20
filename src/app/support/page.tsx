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
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-brand">Support</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-extrabold leading-tight text-ink md:text-5xl">Need help with a stand order?</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
            Use support for custom stand requests, order help, logo or design questions, link setup questions, and link-change help.
          </p>
        </div>
      </section>

      <section className="bg-[#f7f8fa]">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-10 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
          {supportLinks.map(([title, body, href]) => (
            <Link key={title} href={href} className="flex min-h-[180px] flex-col rounded-[18px] border border-line bg-white p-5 transition hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-[0_18px_42px_rgba(17,24,39,0.08)]">
              <h2 className="text-lg font-black text-ink">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
              <span className="mt-auto text-sm font-black text-brand">Open</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
