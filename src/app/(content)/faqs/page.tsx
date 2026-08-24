import type { Metadata } from "next";
import { FaqList } from "@/components/storefront/faq-list";
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
    <main className="bg-white text-ink">
      <section className="bg-white">
        <div className="tr-container py-12 lg:py-16">
          <p className="tr-eyebrow">Support</p>
          <h1 className="mt-4 max-w-4xl text-[2.45rem] font-semibold leading-[1.06] text-[#111317] sm:text-[3.25rem]">Tap Rater FAQs</h1>
          <p className="mt-5 max-w-3xl text-xl font-medium leading-8 text-[#5f686f]">
            Practical answers about Tap Rater stands, QR and NFC setup, branded options, and ordering.
          </p>
        </div>
      </section>
      <section className="bg-[#f7f8f8]">
        <div className="tr-container py-12 lg:py-16">
          <FaqList faqs={faqs} className="mx-auto grid max-w-4xl gap-3" />
        </div>
      </section>
    </main>
  );
}
