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
  ["Standard stand returns", "Standard-design stands can be returned within 30 days of delivery. We accept unopened, opened, or slightly used stands, provided they have no scratches or physical damage. The customer arranges and pays for return shipping. There is no restocking fee. Contact support before mailing the stand so we can provide return instructions and the correct return address."],
  ["When refunds are issued", "We issue your refund when we receive your returned stand and confirm that it meets the return conditions above. Your bank or payment provider may take additional time to post the refund to your account."],
  ["Branded and customized products", "Branded + QR and other customized products are made with customer-provided logos, business names, and artwork. They cannot be returned for a change of mind. If your item arrives damaged or defective, contact support for help."],
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
        body="Standard stands have a 30-day return window from delivery, with customer-paid return shipping. Custom-branded stands cannot be returned for a change of mind."
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
