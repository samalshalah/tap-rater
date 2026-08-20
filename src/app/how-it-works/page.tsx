import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How Tap Rater Works",
  description: "Choose a stand, add your link or branding, approve your design, and Tap Rater prints and ships."
};

const steps = [
  ["Choose your stand", "Pick a review, menu, booking, social, feedback, or website stand from the active shop catalog."],
  ["Add your link", "Standard Direct needs one destination URL and goes straight to setup review."],
  ["Customize if branded", "Branded + QR collects the logo, business name, and generates the printed QR from your link."],
  ["Preview and checkout", "Branded stands show a front proof before cart. Tap Rater then prepares the physical stand."]
];

const flows = [
  ["Standard Direct", "Choose stand → add link → cart → checkout", "NFC only, no printed QR."],
  ["Branded + QR", "Choose stand → add link → upload logo → add business name → preview QR proof → cart → checkout", "NFC + printed QR with proof before cart."]
];

export default function HowItWorksPage() {
  return (
    <main className="bg-white text-ink">
      <section className="border-b border-line bg-white">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-brand">How it works</p>
          <h1 className="mt-4 max-w-3xl text-4xl font-extrabold leading-tight text-ink md:text-5xl">From product page to printed stand.</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
            Direct stands are built for fast checkout. Branded + QR adds logo upload and proof confirmation before the order reaches the cart.
          </p>
        </div>
      </section>

      <section className="bg-[#f7f8fa]">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-10 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
          {steps.map(([title, body], index) => (
            <article key={title} className="rounded-[18px] border border-line bg-white p-5">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-ink text-sm font-black text-white">{index + 1}</span>
              <h2 className="mt-5 text-lg font-black text-ink">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
            </article>
          ))}
        </div>
        <div className="mx-auto max-w-7xl px-4 pb-10 sm:px-6 lg:px-8">
          <div className="mb-6 grid gap-4 md:grid-cols-2">
            {flows.map(([title, body, note]) => (
              <article key={title} className="rounded-[18px] border border-line bg-white p-5">
                <h2 className="text-lg font-black text-ink">{title}</h2>
                <p className="mt-2 text-sm font-bold text-muted">{body}</p>
                <p className="mt-2 text-sm leading-6 text-muted">{note}</p>
              </article>
            ))}
          </div>
          <Link href="/shop" className="inline-flex min-h-11 items-center rounded-full bg-ink px-6 text-sm font-black text-white transition hover:bg-brand">
            Start shopping
          </Link>
        </div>
      </section>
    </main>
  );
}
