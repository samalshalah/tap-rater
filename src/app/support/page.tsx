import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tap Rater Support",
  description: "Get help with Tap Rater stand setup, custom orders, bulk orders, link changes, and hosted multi-link requests."
};

export default function SupportPage() {
  return (
    <main className="bg-[#f5f5f7]">
      <section className="mx-auto max-w-5xl px-4 py-14">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-brand">Support</p>
        <h1 className="mt-4 max-w-4xl text-5xl font-black leading-tight text-ink">Need help with a stand order?</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-muted">
          Use support for complex custom work, bulk orders, hosted multi-link requests, or link-change help.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Link href="/contact-us" className="rounded-md border border-line bg-white p-6 font-black text-ink transition hover:shadow-lg">Contact Tap Rater</Link>
          <Link href="/change-taprater-link" className="rounded-md border border-line bg-white p-6 font-black text-ink transition hover:shadow-lg">Change a link</Link>
          <Link href="/faqs" className="rounded-md border border-line bg-white p-6 font-black text-ink transition hover:shadow-lg">Read FAQs</Link>
        </div>
      </section>
    </main>
  );
}
