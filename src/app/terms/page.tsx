import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms",
  description: "Basic Tap Rater terms for NFC stands, destination links, logo rights, proof approval, and product use."
};

const sections = [
  ["Product use", "Tap Rater sells printed QR and NFC stands for local businesses. Standard Direct stands use QR and NFC with one destination link. Branded + QR stands include customer logo, business name, and proof review before checkout."],
  ["Destination links", "You are responsible for providing an accurate destination URL. Tap Rater may review links for production purposes, but you should test the destination before placing an order and before using the stand with customers."],
  ["Uploaded logos and content", "You are responsible for having the rights to use any logo, image, brand name, business name, or other content you upload or provide. Tap Rater may reject inappropriate, invalid, low-quality, or production-incompatible content."],
  ["Proof approval", "For Branded + QR orders, the proof preview is used to confirm the customer-provided logo, business name, destination, and generated QR. Do not approve a proof unless the visible details are correct."],
  ["NFC and QR behavior", "NFC and QR destinations depend on the URL provided, device compatibility, internet access, and third-party platforms. Tap Rater does not control Google, Yelp, Facebook, booking platforms, menu platforms, social networks, or any destination website."],
  ["No guaranteed results", "Tap Rater stands are designed to make it easier for customers to open your link. We do not guarantee reviews, bookings, sales, followers, feedback volume, ratings, platform approvals, or business results."],
  ["Support", "For order, production, link, or setup questions, contact Tap Rater through support."]
];

export default function TermsPage() {
  return (
    <main className="bg-white text-ink">
      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-brand">Terms</p>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight text-ink md:text-5xl">Simple terms for Tap Rater orders.</h1>
          <p className="mt-4 text-base leading-7 text-muted">
            These terms explain the customer responsibilities that matter for NFC stands, printed QR proofs, destination links, and uploaded brand assets.
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
              Questions before ordering? <Link href="/support" className="font-black text-brand">Contact support</Link>.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
