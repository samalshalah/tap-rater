import type { Metadata } from "next";
import Link from "next/link";
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
          <nav aria-label="Explore stands by purpose" className="mx-auto mt-7 flex max-w-4xl flex-wrap gap-5 text-sm font-semibold text-brand underline underline-offset-4">
            <Link href="/product/google-review-stand">Google Review Stand</Link>
            <Link href="/product/yelp-review-stand">Yelp Review Stand</Link>
            <Link href="/product/facebook-review-stand">Facebook Review Stand</Link>
            <Link href="/product/menu-and-order-stand">Menu and Order Stand</Link>
            <Link href="/product/instagram-follow-stand">Instagram Follow Stand</Link>
          </nav>
        </div>
      </SectionShell>
    </main>
  );
}
