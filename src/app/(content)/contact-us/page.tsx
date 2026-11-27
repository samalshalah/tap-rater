import type { Metadata } from "next";
import { ContactForm } from "@/components/forms/contact-form";
import { PageHero, SectionShell } from "@/components/storefront/section";

export const metadata: Metadata = {
  title: "Contact Tap Rater",
  description: "Contact Tap Rater for NFC and QR stands, setup support, custom orders, and link updates.",
  alternates: {
    canonical: "/contact-us"
  }
};

export default async function ContactPage({ searchParams }: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const productFeedback = query?.feedback === "google-review-stand";
  return (
    <main className="tr-public-shell text-ink">
      <PageHero
        eyebrow={productFeedback ? "Product feedback" : "Contact"}
        title={productFeedback ? "How is your stand working?" : "Talk to Tap Rater"}
        body={productFeedback ? "Share your experience with your custom Google review stand. Positive and critical feedback are equally welcome. No account is required." : "Ask about NFC and QR stands, custom setup, review link changes, hosted multi-link requests, or which Tap Rater product fits your business."}
      />
      <SectionShell tone="soft" spacing="compact">
        <div className="tr-container-narrow">
          <div className="tr-card p-5 md:p-7">
            {productFeedback ? <p className="tr-body-sm mb-6">Your feedback goes to our team for review. Permission to publish is optional, and there is no reward for leaving a review. We check your order before publishing and keep your email and order number private.</p> : null}
            <ContactForm key={productFeedback ? "google-review-stand" : "contact"} productFeedback={productFeedback} defaultProductName={productFeedback ? "Custom Google Review Stand with Your Logo" : undefined} />
          </div>
        </div>
      </SectionShell>
    </main>
  );
}
