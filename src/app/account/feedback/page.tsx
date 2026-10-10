import type { Metadata } from "next";
import { AccountShell } from "@/components/account/account-shell";
import { ContactForm } from "@/components/forms/contact-form";
import { requireCustomer } from "@/lib/customer-auth";

export const metadata: Metadata = { title: "Share product feedback", robots: { index: false, follow: false } };

export default async function ProductFeedbackPage() {
  await requireCustomer();
  return <AccountShell>
    <section className="tr-card max-w-2xl p-5 sm:p-7">
      <h1 className="text-2xl font-semibold">How is your Tap Rater stand working?</h1>
      <p className="mb-6 mt-3 text-sm leading-6 text-muted">Share your experience after receiving and using your stand. Positive and critical feedback are equally welcome. Your feedback goes to our team; publishing permission is optional, and there is no reward for leaving a review.</p>
      <ContactForm productFeedback />
    </section>
  </AccountShell>;
}
