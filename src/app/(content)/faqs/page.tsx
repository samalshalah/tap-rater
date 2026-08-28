import type { Metadata } from "next";
import { FaqList } from "@/components/storefront/faq-list";
import { SectionShell } from "@/components/storefront/section";
import { getFaqContent, orderedEnabledFaqs } from "@/lib/website-content";

export const metadata: Metadata = {
  title: "Tap Rater FAQs",
  description: "Answers about Tap Rater NFC and QR stands, setup, links, customization, and direct destinations.",
  alternates: {
    canonical: "/faqs"
  }
};

export default async function FaqsPage() {
  const content = await getFaqContent();
  const faqs = orderedEnabledFaqs(content);

  return (
    <main className="tr-public-shell text-ink">
      <SectionShell spacing="hero">
        <div className="tr-container">
          <p className="tr-eyebrow">Support</p>
          <h1 className="tr-page-title mt-4 max-w-4xl">Tap Rater FAQs</h1>
          <p className="tr-body mt-5 max-w-3xl text-lg sm:text-xl">
            Practical answers about Tap Rater stands, QR and NFC setup, branded options, and ordering.
          </p>
        </div>
      </SectionShell>
      <SectionShell tone="soft">
        <div className="tr-container">
          <FaqList faqs={faqs} className="mx-auto grid max-w-4xl gap-3" />
        </div>
      </SectionShell>
    </main>
  );
}
