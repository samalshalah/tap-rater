import type { Metadata } from "next";
import { ContactForm } from "@/components/forms/contact-form";
import { SectionShell } from "@/components/storefront/section";

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
      <SectionShell spacing="compact">
        <div className="tr-container grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="tr-eyebrow">Contact</p>
            <h1 className="tr-page-title mt-3">Talk to Tap Rater</h1>
            <p className="tr-body mt-4">
              Ask about NFC and QR stands, custom setup, review link changes, hosted multi-link requests, or which Tap Rater product fits your business.
            </p>
          </div>
          <div className="tr-card p-5 md:p-7">
            <ContactForm />
          </div>
        </div>
      </SectionShell>
    </main>
  );
}
