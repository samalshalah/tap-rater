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

export default function ContactPage() {
  return (
    <main className="tr-public-shell text-ink">
      <PageHero
        eyebrow="Contact"
        title="Talk to Tap Rater"
        body="Ask about NFC and QR stands, custom setup, review link changes, hosted multi-link requests, or which Tap Rater product fits your business."
      />
      <SectionShell tone="soft" spacing="compact">
        <div className="tr-container-narrow">
          <div className="tr-card p-5 md:p-7">
            <ContactForm />
          </div>
        </div>
      </SectionShell>
    </main>
  );
}
