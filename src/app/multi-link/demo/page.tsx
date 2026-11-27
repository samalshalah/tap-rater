import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, ExternalLink } from "lucide-react";
import { findMultiLinkDemo, multiLinkDemos, readMultiLinkDemoFocus, renderMultiLinkDemoHtml, type MultiLinkDemoFocus } from "@/lib/multilink-demo";

const focusTabs: Array<{ id: MultiLinkDemoFocus; label: string }> = [{ id: "general", label: "All links" }, { id: "reviews", label: "Reviews" }, { id: "social", label: "Social" }];
const demoHref = (type: string, focus: MultiLinkDemoFocus) => `/multi-link/demo?type=${type}${focus === "general" ? "" : `&focus=${focus}`}`;
import { createQrSvg } from "@/lib/qr-code";
import { formatPrice } from "@/lib/products";
import { hostedMultiLinkServiceAddon } from "@/lib/service-addons";

export const metadata: Metadata = {
  title: "Multi-Link Demo: See What Customers See",
  description: "Try a sample Multi-Link page for a restaurant, spa, car dealership, dental office, hotel or home services business. One tap on the stand opens a page like this.",
  alternates: { canonical: "/multi-link/demo" }
};

export default async function MultiLinkDemoPage({ searchParams }: { searchParams: Promise<{ type?: string; focus?: string }> }) {
  const { type, focus: focusParam } = await searchParams;
  const demo = findMultiLinkDemo(type);
  const focus = readMultiLinkDemoFocus(focusParam);
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://taprater.com").replace(/\/$/, "");
  const viewPath = `/multi-link/demo/view?type=${demo.id}${focus === "general" ? "" : `&focus=${focus}`}`;
  const qrSvg = await createQrSvg(`${siteUrl}${viewPath}`).catch(() => "");
  const monthly = formatPrice(hostedMultiLinkServiceAddon.monthlyPriceCents);

  return <main className="tr-public-shell text-ink">
    <section className="tr-container py-10 lg:py-16">
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-x-16 lg:gap-y-0">
        <div className="min-w-0 lg:col-start-1">
          <p className="tr-eyebrow text-brand">Multi-Link demo</p>
          <h1 className="mt-3 text-3xl font-semibold leading-tight sm:text-4xl">See what your customers see.</h1>
          <p className="tr-body mt-4 max-w-xl">One tap or scan on the stand opens a page like this. Pick a business type to see the links we recommend for it.</p>

          <nav aria-label="Business type" className="mt-6 flex flex-wrap gap-2">
            {multiLinkDemos.map((item) => {
              const active = item.id === demo.id;
              return <Link key={item.id} href={demoHref(item.id, focus)} scroll={false} aria-current={active ? "page" : undefined}
                className={`rounded-full border px-4 py-2 text-sm font-medium transition ${active ? "border-ink bg-ink text-white" : "border-line bg-white text-ink hover:border-ink"}`}>{item.tab}</Link>;
            })}
          </nav>
          <nav aria-label="Page type" className="mt-3 flex flex-wrap gap-2">
            {focusTabs.map((tab) => {
              const active = tab.id === focus;
              return <Link key={tab.id} href={demoHref(demo.id, tab.id)} scroll={false} aria-current={active ? "page" : undefined}
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${active ? "border-brand bg-brand text-white" : "border-line bg-white text-ink hover:border-brand"}`}>{tab.label}</Link>;
            })}
          </nav>
        </div>

        <figure className="mx-auto w-full max-w-[320px] lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <div className="overflow-hidden rounded-[2.6rem] border-[10px] border-ink bg-ink shadow-xl">
            <iframe key={`${demo.id}:${focus}`} title={`Sample Multi-Link page for ${demo.businessName}`} sandbox="" srcDoc={renderMultiLinkDemoHtml(demo, focus)} className="block h-[600px] w-full rounded-[1.9rem] border-0 bg-white" />
          </div>
          <figcaption className="mt-3 text-center text-xs text-muted">
            {demo.businessName} is a sample business.{" "}
            <a href={viewPath} target="_blank" rel="noopener" className="inline-flex items-center gap-1 font-semibold text-brand underline lg:hidden">Open full screen<ExternalLink size={12} aria-hidden="true" /></a>
          </figcaption>
        </figure>

        <div className="min-w-0 lg:col-start-1 lg:row-start-2">
          <ul className="grid max-w-xl gap-3 lg:mt-8 text-sm sm:text-base">
            {["Up to 20 links: reviews, menu, booking, payments, social and more", "Change your links anytime. The stand never needs reprinting", "See how many people open your page and which links they tap", `${monthly}/month per page, plus the stand`].map((point) => <li key={point} className="flex gap-2"><Check size={18} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />{point}</li>)}
          </ul>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/multi-link#compatible-stands" className="tr-button-primary">Shop Multi-Link Stands<ArrowRight size={16} aria-hidden="true" /></Link>
            <Link href="/multi-link" className="tr-button-outline">How Multi-Link works</Link>
          </div>

          {qrSvg ? <div className="mt-10 hidden items-center gap-4 rounded-xl border border-line bg-soft p-4 lg:flex lg:max-w-md">
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-md bg-white [&>svg]:h-full [&>svg]:w-full" aria-hidden="true" dangerouslySetInnerHTML={{ __html: qrSvg }} />
            <p className="text-sm text-muted"><span className="block font-semibold text-ink">Try it on your phone</span>Scan this code to open the {demo.tab.toLowerCase()} sample the way your customers will.</p>
          </div> : null}
        </div>
      </div>
    </section>
  </main>;
}
