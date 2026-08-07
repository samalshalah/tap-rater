import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How Tap Rater Works",
  description: "Choose a stand, add your link or branding, approve your design, and Tap Rater prints and ships."
};

const steps = [
  ["Choose your stand", "Pick a review, menu, booking, social, feedback, website, or custom stand."],
  ["Add your link or branding", "Standard stands need one link. Branded and custom stands collect the required business details."],
  ["Approve your design", "Configured stands require approval before checkout."],
  ["We print and ship", "Tap Rater confirms production artwork and prepares the physical stand."]
];

export default function HowItWorksPage() {
  return (
    <main className="bg-white">
      <section className="mx-auto max-w-6xl px-4 py-14">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-brand">How it works</p>
        <h1 className="mt-4 max-w-4xl text-5xl font-black leading-tight text-ink">From product page to printed stand.</h1>
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {steps.map(([title, body], index) => (
            <article key={title} className="rounded-md border border-line bg-[#f5f5f7] p-6">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-ink text-sm font-black text-white">{index + 1}</span>
              <h2 className="mt-5 text-xl font-black text-ink">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-muted">{body}</p>
            </article>
          ))}
        </div>
        <Link href="/shop" className="mt-8 inline-flex rounded-md bg-ink px-6 py-4 text-sm font-black text-white transition hover:bg-brand">
          Start shopping
        </Link>
      </section>
    </main>
  );
}
