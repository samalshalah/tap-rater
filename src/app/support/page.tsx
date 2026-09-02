import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { PageHero, SectionHeader, SectionShell } from "@/components/storefront/section";

export const metadata: Metadata = {
  title: "Tap Rater Support",
  description: "Get help with Tap Rater stand setup, custom stand requests, order questions, logo questions, and link changes."
};

const supportLinks = [
  ["Request custom work", "Ask about a custom stand, design question, bulk order, or order detail.", "/contact-us"],
  ["Change a link", "Request an update for an existing Tap Rater stand.", "/change-taprater-link"],
  ["Read FAQs", "Quick answers about setup, checkout, artwork, and fulfillment.", "/faqs"],
  ["Privacy", "How Tap Rater handles order details, uploaded logos, destination links, and support requests.", "/privacy-policy"],
  ["Terms", "Customer responsibilities for links, uploaded logos, artwork, and product use.", "/terms"],
  ["Refunds", "Refund, cancellation, damaged item, and replacement guidance for stands.", "/refund-policy"],
  ["Shipping", "Order readiness, shipping estimates, and order issue support.", "/shipping"]
];

export default function SupportPage() {
  return (
    <main className="tr-public-shell text-ink">
      <PageHero
        eyebrow="Support"
        title="Need help with a stand order?"
        body="Use support for custom stand requests, order help, logo or design questions, link setup questions, and link-change help."
      />

      <SectionShell tone="soft">
        <div className="tr-container">
          <SectionHeader
            eyebrow="Help topics"
            title="Choose the support path that matches the question."
            body="Start with the topic closest to the order, setup, shipping, or artwork issue."
          />
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {supportLinks.map(([title, body, href]) => (
            <Link key={title} href={href} className="tr-hover-card flex min-h-[180px] flex-col p-5">
              <h2 className="tr-card-title">{title}</h2>
              <p className="tr-body-sm mt-2">{body}</p>
              <span className="mt-auto inline-flex items-center gap-2 pt-6 text-sm font-semibold text-brand">
                Open
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>
        </div>
      </SectionShell>
    </main>
  );
}
