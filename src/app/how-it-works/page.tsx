import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How Tap Rater Works",
  description: "Choose a stand, add your link, and get a Tap Rater stand ready for your counter."
};

const steps = [
  ["Choose your stand", "Pick a review, menu, booking, social, feedback, or website stand from the active shop catalog."],
  ["Add your link", "Standard Direct needs one destination URL and goes straight to setup review."],
  ["Confirm QR and NFC", "The QR code and NFC tap target both use the same customer-provided URL."],
  ["Checkout", "Tap Rater collects the order and shipping details before preparing your stand."]
];

const flows = [
  ["Standard Direct", "Choose stand → add link → cart → checkout", "QR and NFC direct to your destination."],
  ["No hosted activation", "No account → no hosted page → no subscription", "DIRECT products do not require a Tap Rater account or activation workflow."]
];

export default function HowItWorksPage() {
  return (
    <main className="bg-white text-ink">
      <section className="border-b border-line bg-white">
        <div className="tr-container grid gap-8 py-12 lg:grid-cols-[0.82fr_1fr] lg:items-center lg:py-16">
          <div className="lg:pr-6">
            <p className="tr-eyebrow">How it works</p>
            <h1 className="tr-page-title mt-4 max-w-3xl">From product page to counter-ready stand.</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
              Direct stands are built for fast checkout: choose the stand, add one destination URL, and complete checkout.
            </p>
          </div>
          <div className="tr-page-hero-media relative aspect-[4/3] overflow-hidden rounded-[34px] bg-[#f7f8f8] shadow-[0_22px_70px_rgba(16,32,30,0.08)]">
            <Image src="/uploads/products/google-review-stand.png" alt="Tap Rater Google Review stand" fill unoptimized className="object-contain p-7 mix-blend-multiply sm:p-10" />
          </div>
        </div>
      </section>

      <section className="bg-[#f7f8fa]">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-10 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
          {steps.map(([title, body], index) => (
            <article key={title} className="rounded-[18px] border border-line bg-white p-5">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-sm font-semibold text-white">{index + 1}</span>
              <h2 className="mt-5 text-lg font-semibold text-ink">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
            </article>
          ))}
        </div>
        <div className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
          <div className="mb-6 grid gap-4 md:grid-cols-2">
            {flows.map(([title, body, note]) => (
              <article key={title} className="rounded-[18px] border border-line bg-white p-5">
                <h2 className="text-lg font-semibold text-ink">{title}</h2>
                <p className="mt-2 text-sm font-semibold text-muted">{body}</p>
                <p className="mt-2 text-sm leading-6 text-muted">{note}</p>
              </article>
            ))}
          </div>
          <Link href="/shop" className="inline-flex min-h-11 items-center rounded-full bg-ink px-6 text-sm font-semibold text-white transition hover:bg-brand">
            Start shopping
          </Link>
        </div>
      </section>
    </main>
  );
}
