import Link from "next/link";
import type { Metadata } from "next";
import { PageHero, SectionShell } from "@/components/storefront/section";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "Tap Rater refund and replacement guidance for NFC stands, branded artwork, damaged items, and customer-provided setup details.",
  alternates: { canonical: "/refund-policy" }
};

const sections = [
  ["Before fulfillment starts", "If you need to cancel or correct an order, contact Tap Rater as soon as possible. Standard Direct orders may be cancelable before fulfillment has started."],
  ["Branded and customized products", "Branded + QR and other customized products use customer-provided logo, business name, destination, and artwork details. Once fulfillment begins, these items may not be refundable unless there is an order issue."],
  ["Damaged or defective items", "If an item arrives damaged or defective, contact support with the order information and photos of the issue. Tap Rater will review the problem and help with a replacement or appropriate next step."],
  ["Customer-provided link or logo issues", "If the destination link, logo, business name, or artwork details were provided incorrectly, a replacement or update may require an additional charge."],
  ["How to request help", "Use the support page for refund, cancellation, replacement, or order correction questions. Include your order email and a short description of the issue."]
];

export default function RefundPolicyPage() {
  return (
    <main className="tr-public-shell text-ink">
      <PageHero
        eyebrow="Refund Policy"
        title="Refunds, replacements, and order changes."
        body="This policy explains how we handle cancellations, damaged items, and customer-provided setup details."
      />

      <SectionShell tone="soft" spacing="compact">
        <div className="tr-container-narrow grid gap-4">
          {sections.map(([title, body]) => (
            <article key={title} className="tr-card p-5">
              <h2 className="tr-card-title">{title}</h2>
              <p className="tr-body-sm mt-3">{body}</p>
            </article>
          ))}
          <div className="tr-card p-5">
            <p className="tr-body-sm">
              Need order help? <Link href="/support" className="font-semibold text-brand hover:text-brand-dark">Contact Tap Rater support</Link>.
            </p>
          </div>
        </div>
      </SectionShell>
    </main>
  );
}
