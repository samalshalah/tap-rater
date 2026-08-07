import type { Metadata } from "next";
import { ContactForm } from "@/components/forms/contact-form";

export const metadata: Metadata = {
  title: "Contact Tap Rater",
  description: "Contact Tap Rater for NFC and QR stands, setup support, custom orders, and link updates.",
  alternates: {
    canonical: "/contact-us"
  }
};

export default function ContactPage() {
  return (
    <section className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-[0.8fr_1.2fr]">
      <div>
        <p className="text-sm font-semibold uppercase text-brand">Contact</p>
        <h1 className="mt-3 text-4xl font-black text-ink">Talk to Tap Rater</h1>
        <p className="mt-4 leading-7 text-muted">
          Ask about NFC and QR stands, custom setup, review link changes, hosted multi-link requests, or which Tap Rater product fits your business.
        </p>
      </div>
      <div className="rounded-md border border-line bg-white p-5 shadow-sm md:p-7">
        <ContactForm />
      </div>
    </section>
  );
}
