import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "@/components/product/product-card";
import { SectionHeader, SectionShell } from "@/components/storefront/section";
import { getStorefrontProducts, staticStorefrontProducts } from "@/lib/product-repository";
import { hostedMultiLinkServiceAddon, productSupportsMultiLink } from "@/lib/service-addons";
import { formatPrice } from "@/lib/products";

export const dynamic = "force-dynamic";

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
      <SectionShell spacing="compact" className="py-10 sm:py-14 lg:py-16">
        <div className="tr-container grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <div>
            <p className="tr-eyebrow">Multi-Link service</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-black leading-tight text-ink sm:text-5xl">
              One stand. Up to 10 links. Update them anytime.
            </h1>
            <p className="tr-body mt-4 max-w-2xl text-lg">
              Add Multi-Link to a compatible Tap Rater stand for {monthlyPrice}/month. QR and NFC point to one permanent Tap Rater URL that opens an editable mobile-friendly page.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="#compatible-stands" className="tr-button-primary">
                Shop Compatible Stands
              </Link>
              <Link href="/shop" className="tr-button-outline">
                Browse All Stands
              </Link>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              "QR + NFC point to one permanent Tap Rater URL",
              "Up to 10 editable links",
              "Change links anytime",
              "Customer account included",
              "No need to replace the stand when links change",
              "Mobile-friendly hosted landing page"
            ].map((benefit, index) => (
              <div key={benefit} className="tr-card p-6">
                <p className="tr-eyebrow text-brand">{String(index + 1).padStart(2, "0")}</p>
                <p className="mt-3 text-base font-black leading-6 text-ink">{benefit}</p>
              </div>
            ))}
          </div>
        </div>
      </SectionShell>

      <SectionShell tone="soft" spacing="default">
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
