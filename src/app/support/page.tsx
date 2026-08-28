import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { SectionHeader, SectionShell } from "@/components/storefront/section";

export const metadata: Metadata = {
  title: "Tap Rater Support",
  description: "Get help with Tap Rater stand setup, custom stand requests, order questions, logo questions, and link changes."
};

const supportLinks = [
  ["Request custom work", "Ask about a custom stand, design question, bulk order, or order detail.", "/contact-us"],
  ["Change a link", "Request an update for an existing Tap Rater stand.", "/change-taprater-link"],
  ["Read FAQs", "Quick answers about setup, checkout, proofing, and fulfillment.", "/faqs"],
  ["Privacy", "How Tap Rater handles order details, uploaded logos, destination links, and support requests.", "/privacy-policy"],
  ["Terms", "Customer responsibilities for links, uploaded logos, proof approval, and product use.", "/terms"],
  ["Refunds", "Refund, cancellation, damaged item, and replacement guidance for stands.", "/refund-policy"],
  ["Shipping", "Order readiness, shipping estimates, and order issue support.", "/shipping"]
];

export default function SupportPage() {
  return (
    <main className="tr-public-shell text-ink">
      <SectionShell spacing="compact">
        <div className="tr-container">
          <p className="tr-eyebrow">Support</p>
          <h1 className="tr-page-title mt-4 max-w-3xl">Need help with a stand order?</h1>
          <p className="tr-body mt-4 max-w-2xl">
            Use support for custom stand requests, order help, logo or design questions, link setup questions, and link-change help.
          </p>
        </div>
      </SectionShell>

      <SectionShell tone="soft">
        <div className="tr-container">
          <SectionHeader
            eyebrow="Help topics"
            title="Choose the support path that matches the question."
            body="Start with the topic closest to the order, setup, shipping, or proof issue."
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
