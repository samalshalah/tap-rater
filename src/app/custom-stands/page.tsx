import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Custom NFC and QR Stands",
  description: "Create a custom Tap Rater tabletop NFC and QR stand with your logo, business name, headline, CTA, and one direct destination link."
};

export default function CustomStandsPage() {
  return (
    <main className="bg-white">
      <section className="mx-auto grid max-w-7xl gap-8 px-4 py-14 lg:grid-cols-[1fr_0.8fr] lg:items-start">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.18em] text-brand">Custom stands</p>
          <h1 className="mt-4 max-w-4xl text-5xl font-black leading-tight text-ink">Custom printed NFC and QR stands from $49.</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-muted">
            Add your logo, business name, custom headline or center content, CTA sentence, and one direct destination link. The stand uses locked production zones so the proof stays printable.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/product/custom-direct-stand" className="inline-flex items-center justify-center rounded-md bg-ink px-6 py-4 text-sm font-black text-white transition hover:bg-brand">
              Start Custom Direct Stand
            </Link>
            <Link href="/support" className="inline-flex items-center justify-center rounded-md border border-line bg-white px-6 py-4 text-sm font-black text-ink transition hover:border-ink">
              Request complex setup
            </Link>
          </div>
        </div>
        <aside className="rounded-md border border-line bg-[#f5f5f7] p-6">
          <p className="text-sm font-black text-ink">Hosted Multi-Link Page</p>
          <p className="mt-2 text-sm leading-6 text-muted">
            Coming soon. Multi-link subscriptions are request-only until the full hosted page and billing lifecycle is approved.
          </p>
        </aside>
      </section>
    </main>
  );
}
