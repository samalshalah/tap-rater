import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tap Rater FAQs",
  description: "Answers about Tap Rater NFC and QR stands, setup, link changes, and review destinations.",
  alternates: {
    canonical: "/faqs"
  }
};

const faqs = [
  {
    question: "What can a Tap Rater product open?",
    answer: "A Tap Rater stand can open a Google review link, Facebook recommendation page, Yelp listing, menu, booking page, survey, website, or custom URL."
  },
  {
    question: "Can I change the link later?",
    answer: "Yes. Use the Change TapRater Link form and include your TapRater ID or product SKU with the new destination URL."
  },
  {
    question: "Where should I place it?",
    answer: "Place it where customers finish a positive interaction: checkout, front desk, pickup counter, reception, table service, or service desk."
  },
  {
    question: "Is checkout live?",
    answer: "Stripe checkout remains test-mode only in this branch. Live payments must be approved separately before launch."
  }
];

export default function FaqsPage() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-12">
      <p className="text-sm font-semibold uppercase text-brand">Support</p>
      <h1 className="mt-3 text-4xl font-black text-ink">Tap Rater FAQs</h1>
      <div className="mt-8 grid gap-4">
        {faqs.map((faq) => (
          <article key={faq.question} className="rounded-md border border-line bg-white p-5">
            <h2 className="text-lg font-black text-ink">{faq.question}</h2>
            <p className="mt-2 leading-7 text-muted">{faq.answer}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
