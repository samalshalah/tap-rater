import Link from "next/link";
import type { Metadata } from "next";
import { getShippingSettings } from "@/lib/shipping-settings";

export const metadata: Metadata = {
  title: "Shipping",
  description: "Tap Rater production and shipping information for printed NFC and QR stands."
};

export default async function ShippingPage() {
  const settings = await getShippingSettings();
  const sections = [
    ["Printed on demand", "Tap Rater stands are prepared after checkout based on the selected stand and approved destination link."],
    ["Production readiness", "Standard Direct orders can move toward fulfillment after the destination link is provided and the order is paid."],
    ["Shipping timelines", settings.customerFacingShippingNote],
    ["Supported regions", settings.supportedRegionsText || "United States"],
    ["Handling time", settings.handlingTimeText || "Handling timelines are confirmed during fulfillment review."],
    ["Carrier notes", settings.defaultCarrierNotes || "Carrier details and tracking are added when an order ships."],
    ["Shipping address", "Please review your shipping and contact information before checkout. Incorrect addresses can delay delivery or require additional support."],
    ["Order issues", "If you have a shipping, delivery, damaged item, or fulfillment question, contact Tap Rater support with your order email and details."]
  ];

  return (
    <main className="bg-white text-ink">
      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-brand">Shipping</p>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight text-ink md:text-5xl">Production and shipping for Tap Rater stands.</h1>
          <p className="mt-4 text-base leading-7 text-muted">
            Tap Rater sells printed NFC stands that are prepared after setup details are complete and the order is ready for fulfillment.
          </p>
        </div>
      </section>

      <section className="bg-[#f7f8fa]">
        <div className="mx-auto grid max-w-4xl gap-4 px-4 py-10 sm:px-6 lg:px-8">
          {sections.map(([title, body]) => (
            <article key={title} className="rounded-[18px] border border-line bg-white p-5 shadow-sm">
              <h2 className="text-lg font-black text-ink">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted">{body}</p>
            </article>
          ))}
          <div className="rounded-[18px] border border-line bg-white p-5">
            <p className="text-sm leading-6 text-muted">
              Need shipping help? <Link href="/support" className="font-black text-brand">Contact support</Link>.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
