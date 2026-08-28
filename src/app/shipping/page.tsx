import Link from "next/link";
import type { Metadata } from "next";
import { SectionShell } from "@/components/storefront/section";
import { getShippingSettings } from "@/lib/shipping-settings";

export const metadata: Metadata = {
  title: "Shipping",
  description: "Tap Rater shipping information for NFC and QR stands."
};

export default async function ShippingPage() {
  const settings = await getShippingSettings();
  const sections = [
    ["Prepared after checkout", "Tap Rater stands are prepared after checkout based on the selected stand and approved destination link."],
    ["Order readiness", "Standard Direct orders can move toward fulfillment after the destination link is provided and the order is paid."],
    ["Shipping timelines", settings.customerFacingShippingNote],
    ["Supported regions", settings.supportedRegionsText || "United States"],
    ["Handling time", settings.handlingTimeText || "Handling timelines are confirmed during fulfillment review."],
    ["Carrier notes", settings.defaultCarrierNotes || "Carrier details and tracking are added when an order ships."],
    ["Shipping address", "Please review your shipping and contact information before checkout. Incorrect addresses can delay delivery or require additional support."],
    ["Order issues", "If you have a shipping, delivery, damaged item, or fulfillment question, contact Tap Rater support with your order email and details."]
  ];

  return (
    <main className="tr-public-shell text-ink">
      <SectionShell spacing="compact">
        <div className="tr-container-narrow">
          <p className="tr-eyebrow">Shipping</p>
          <h1 className="tr-page-title mt-4">Shipping for Tap Rater stands.</h1>
          <p className="tr-body mt-4">
            Tap Rater stands are prepared after setup details are complete and the order is ready for fulfillment.
          </p>
        </div>
      </SectionShell>

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
              Need shipping help? <Link href="/support" className="font-semibold text-brand hover:text-brand-dark">Contact support</Link>.
            </p>
          </div>
        </div>
      </SectionShell>
    </main>
  );
}
