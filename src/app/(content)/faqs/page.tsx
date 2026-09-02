import type { Metadata } from "next";
import { FaqList } from "@/components/storefront/faq-list";
import { PageHero, SectionShell } from "@/components/storefront/section";
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
      <PageHero
        eyebrow="Support"
        title="Tap Rater FAQs"
        body="Practical answers about Tap Rater stands, QR and NFC setup, branded options, and ordering."
      />
      <SectionShell tone="soft">
        <div className="tr-container">
          <FaqList faqs={faqs} className="mx-auto grid max-w-4xl gap-3" />
        </div>
      </SectionShell>
    </main>
  );
}
