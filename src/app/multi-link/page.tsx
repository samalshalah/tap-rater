import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ProductCard } from "@/components/product/product-card";
import { SectionHeader, SectionShell } from "@/components/storefront/section";
import { getStorefrontProducts, staticStorefrontProducts } from "@/lib/product-repository";
import { hostedMultiLinkServiceAddon, productSupportsMultiLink } from "@/lib/service-addons";
import { formatPrice } from "@/lib/products";

export const dynamic = "force-dynamic";

const benefits = [
  "QR + NFC point to one permanent Tap Rater URL",
  "Up to 10 editable links",
  "Change links anytime",
  "Customer account included",
  "No need to replace the stand when links change",
  "Mobile-friendly hosted landing page"
];

export const metadata: Metadata = {
  title: "Multi-Link Service | Tap Rater",
  description: "Add Multi-Link to a compatible Tap Rater stand for an editable hosted page with up to 10 customer links."
};

export default async function MultiLinkPage() {
  const databaseCompatibleProducts = (await getStorefrontProducts()).filter(productSupportsMultiLink);
  const compatibleProducts = (databaseCompatibleProducts.length > 0 ? databaseCompatibleProducts : staticStorefrontProducts().filter(productSupportsMultiLink)).slice(0, 8);
  const monthlyPrice = formatPrice(hostedMultiLinkServiceAddon.monthlyPriceCents).replace(".00", "");

  return (
    <main className="tr-public-shell text-ink">
      <SectionShell spacing="hero">
        <div className="tr-container grid gap-8 lg:grid-cols-[0.82fr_1fr] lg:items-center">
          <div className="lg:pr-6">
            <p className="tr-eyebrow">Multi-Link service</p>
            <h1 className="tr-page-title mt-4 max-w-3xl">
              One stand. Up to 10 links. Update them anytime.
            </h1>
            <p className="tr-body mt-5 max-w-3xl text-lg sm:text-xl">
              Add Multi-Link to a compatible Tap Rater stand for {monthlyPrice}/month. QR and NFC point to one permanent Tap Rater URL that opens an editable mobile-friendly page.
            </p>
          </div>
          <div className="tr-premium-surface relative aspect-[4/3]">
            <Image
              src="/uploads/marketing/multi-link-hero-rate-your-experience.png"
              alt="Rate Your Experience Tap Rater stand on a table beside a phone showing a Multi-Link landing page"
              fill
              priority
              unoptimized
              className="object-contain p-7 mix-blend-multiply sm:p-10"
            />
          </div>
        </div>
      </SectionShell>

      <SectionShell tone="soft">
        <div className="tr-container">
          <SectionHeader
            eyebrow="Hosted page"
            title="One permanent page for every customer action."
            body="Multi-Link gives the stand a hosted landing page that can be managed after purchase from the customer account."
          />
          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {benefits.map((benefit, index) => (
              <article key={benefit} className="tr-card p-5">
                <p className="tr-eyebrow text-brand">{String(index + 1).padStart(2, "0")}</p>
                <h2 className="mt-3 text-lg font-semibold leading-6 text-ink">{benefit}</h2>
              </article>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="#compatible-stands" className="tr-button-primary">
              Shop Compatible Stands
            </Link>
            <Link href="/shop" className="tr-button-outline">
              Browse All Stands
            </Link>
          </div>
        </div>
      </SectionShell>

      <SectionShell spacing="default">
        <div id="compatible-stands" className="tr-container">
          <SectionHeader
            align="left"
            eyebrow="Compatible products"
            title="Shop stands that can add Multi-Link."
            body="Multi-Link is offered only on products whose physical message can reasonably open multiple customer links."
          />
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {compatibleProducts.map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>
        </div>
      </SectionShell>
    </main>
  );
}
