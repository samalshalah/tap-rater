import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "Tap Rater refund and replacement guidance for printed NFC stands, branded proofs, damaged items, and customer-provided setup details."
};

const sections = [
  ["Before production starts", "If you need to cancel or correct an order, contact Tap Rater as soon as possible. Standard Direct orders may be cancelable before production has started."],
  ["Branded and customized products", "Branded + QR and other customized printed products are made with customer-provided logo, business name, destination, and proof details. Once a proof is approved or production begins, these items may not be refundable unless there is a production issue."],
  ["Damaged or defective items", "If an item arrives damaged or defective, contact support with the order information and photos of the issue. Tap Rater will review the problem and help with a replacement or appropriate next step."],
  ["Customer-provided link or logo issues", "If the destination link, logo, business name, or proof details were provided or approved incorrectly, a replacement, reprint, or reprogramming may require an additional charge."],
  ["How to request help", "Use the support page for refund, cancellation, replacement, or order correction questions. Include your order email and a short description of the issue."]
];

export default function RefundPolicyPage() {
  return (
    <main className="bg-white text-ink">
      <section className="border-b border-line bg-white">
        <div className="tr-container-narrow tr-section-compact">
          <p className="tr-eyebrow">Refund Policy</p>
          <h1 className="tr-page-title mt-4">Refunds, replacements, and order changes.</h1>
          <p className="tr-body mt-4">
            Tap Rater products are printed on demand. This policy explains how we handle cancellations, damaged items, and customer-provided setup details.
          </p>
        </div>
      </section>

      <section className="bg-soft">
        <div className="tr-container-narrow grid gap-4 py-10">
          {sections.map(([title, body]) => (
            <article key={title} className="tr-card p-5">
              <h2 className="tr-card-title">{title}</h2>
              <p className="tr-body-sm mt-3">{body}</p>
            </article>
          ))}
          <div className="tr-card p-5">
            <p className="tr-body-sm">
              Need order help? <Link href="/support" className="font-black text-brand">Contact Tap Rater support</Link>.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
