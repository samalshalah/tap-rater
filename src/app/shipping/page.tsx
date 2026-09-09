import Link from "next/link";
import type { Metadata } from "next";
import { PageHero, SectionShell } from "@/components/storefront/section";
import { getShippingSettings } from "@/lib/shipping-settings";

export const metadata: Metadata = {
  title: "Shipping",
  description: "Tap Rater shipping information for NFC and QR stands.",
  alternates: { canonical: "/shipping" }
};

export default async function ShippingPage() {
  const settings = await getShippingSettings();
  const sections = [
    ["Prepared after checkout", "Tap Rater stands are prepared after checkout based on the selected stand and approved destination link."],
    ["Standard preparation", "Standard stands are prepared after payment and destination setup are complete."],
    ["Branded preparation", "Branded stands are prepared using the artwork approved at checkout. Final production artwork is generated after confirmed payment."],
    ["Shipping costs", settings.customerFacingShippingNote],
    ["Supported regions", settings.supportedRegionsText || "United States"],
    ...(settings.handlingTimeText.trim() ? [["Preparation time", settings.handlingTimeText]] : []),
    ["Carrier notes", settings.defaultCarrierNotes || "Carrier details and tracking are added when an order ships."],
    ["Shipping address", "Please review your shipping and contact information before checkout. Incorrect addresses can delay delivery or require additional support."],
    ["Order issues", "If you have a shipping, delivery, damaged item, or fulfillment question, contact Tap Rater support with your order email and details."]
  ];

  return (
    <main className="tr-public-shell text-ink">
      <PageHero
        eyebrow="Shipping"
        title="Shipping for Tap Rater stands."
        body="Tap Rater stands are prepared after setup details are complete and the order is ready for fulfillment."
      />

      <SectionShell tone="soft" spacing="compact">
        <div className="tr-container-narrow grid gap-4">
          {sections.map(([title, body]) => (
            <article key={title} className="border-b border-line py-5 last:border-b-0">
              <h2 className="tr-card-title">{title}</h2>
              <p className="tr-body-sm mt-3 whitespace-pre-line">{body}</p>
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
