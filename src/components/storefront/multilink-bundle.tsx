import Link from "next/link";
import type { MigratedProduct } from "@/data/migrated-products";
import type { BusinessUseGuide } from "@/lib/business-use-guide";
import { getHostedButtonMark, supportedHostedPageButtons } from "@/lib/hosted-page-editor-shared";
import { formatPrice } from "@/lib/products";
import { getProductPurchaseOptions } from "@/lib/purchase-options";
import { singleStandPrice, type OffersSettings } from "@/lib/offers";
import { hostedMultiLinkServiceAddon } from "@/lib/service-addons";
import { isMultiLinkIndustry, multiLinkFocus, recommendedMultiLinks } from "@/lib/multilink-industries";
import { SectionHeader, SectionShell } from "./section";

type Bundle = NonNullable<BusinessUseGuide["bundle"]>;

const compactPrice = (cents: number) => formatPrice(cents).replace(".00", "");

// Same single-stand price the product page charges, including any active offer.
function standPriceCents(product: MigratedProduct, offers?: OffersSettings | null) {
  const option = [...getProductPurchaseOptions(product)].sort((a, b) => a.priceCents - b.priceCents)[0];
  return option ? singleStandPrice(product.slug, option.id, option.priceCents, offers) : product.basePriceCents;
}

// Buy-first section: each card shows the stand, the links its Multi-Link page holds, and the price.
export function MultiLinkBundleSection({ bundle, products, businessTitle, businessSlug, offers }: { bundle: Bundle; products: MigratedProduct[]; businessTitle: string; businessSlug?: string; offers?: OffersSettings | null }) {
  const industry = isMultiLinkIndustry(businessSlug) ? businessSlug : undefined;
  const items = bundle.items.flatMap((item) => {
    const product = products.find((candidate) => candidate.slug === item.productSlug);
    return product ? [{ ...item, product }] : [];
  });
  if (!items.length) return null;
  const monthly = compactPrice(hostedMultiLinkServiceAddon.monthlyPriceCents);

  return (
    <SectionShell tone="soft" spacing="compact" id="bundle" className="scroll-mt-24">
      <div className="tr-container">
        <SectionHeader eyebrow={bundle.eyebrow || `${businessTitle} bundle`} title={bundle.title} body={bundle.body || undefined} />
        <div className={`mt-7 grid gap-5 ${items.length > 1 ? "md:grid-cols-2" : ""}`}>
          {items.map((item) => {
            // Reviews and social stands show the same links setup starts with for this business.
            const focus = multiLinkFocus(item.productSlug);
            const presetTypes = industry && (focus === "reviews" || focus === "social") ? recommendedMultiLinks(industry, item.productSlug).map((link) => link.type) : null;
            const linkTypes = [...new Set(presetTypes ?? item.linkTypes)].filter((type) => supportedHostedPageButtons.some((button) => button.type === type));
            const setupHref = `/product/${item.product.slug}?addon=multilink${industry ? `&business=${industry}` : ""}`;
            const exampleHref = industry && (focus === "reviews" || focus === "social") ? `/multi-link/demo?type=${industry}&focus=${focus}` : null;
            return (
              <article key={item.productSlug} className="grid content-start gap-4 rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-start gap-4">
                  {item.product.images[0]?.src ? (
                    <img src={item.product.images[0].src} alt={item.product.images[0].alt || item.product.title} className="h-24 w-24 shrink-0 rounded-xl border border-line bg-soft object-contain p-1" loading="lazy" />
                  ) : null}
                  <div className="min-w-0">
                    <p className="tr-eyebrow">{item.label}</p>
                    <h3 className="mt-2 text-xl font-semibold leading-tight text-ink">{item.title}</h3>
                    <p className="tr-body-sm mt-2">{item.body}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">One tap opens</p>
                  <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label={`Links on the ${item.title} page`}>
                    {linkTypes.map((type) => {
                      const mark = getHostedButtonMark(type);
                      return (
                        <li key={type} className="flex min-w-0 items-center gap-2 rounded-lg border border-line bg-soft px-2 py-1.5 text-sm font-medium text-ink">
                          {mark.logo ? (
                            <img src={mark.logo} alt="" className="h-7 w-7 shrink-0 rounded-md" loading="lazy" />
                          ) : (
                            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-[10px] font-bold" style={{ background: mark.background, color: mark.color }}>{mark.text}</span>
                          )}
                          <span className="truncate">{mark.brand}</span>
                        </li>
                      );
                    })}
                    {hostedMultiLinkServiceAddon.maxLinks > linkTypes.length ? (
                      <li className="flex min-w-0 items-center gap-2 rounded-lg border border-dashed border-brand/40 bg-white px-2 py-1.5 text-sm font-semibold text-brand">
                        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-brand/10 text-base leading-none" aria-hidden="true">+</span>
                        <span className="truncate">{hostedMultiLinkServiceAddon.maxLinks - linkTypes.length} more links</span>
                      </li>
                    ) : null}
                  </ul>
                </div>
                <div className="flex flex-wrap items-end justify-between gap-3 border-t border-line pt-4">
                  <p className="text-ink">
                    <span className="text-2xl font-semibold">{compactPrice(standPriceCents(item.product, offers))}</span>
                    <span className="text-sm text-muted"> stand, one-time</span>
                    <span className="block text-sm text-muted">+ {monthly}/month Multi-Link page</span>
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    {exampleHref ? <Link href={exampleHref} className="text-sm font-semibold text-brand underline underline-offset-4">See an example</Link> : null}
                    <Link href={setupHref} className="tr-button-primary min-h-11 px-5 text-sm">{item.ctaLabel || "Set up this stand"}</Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
        {bundle.note ? <p className="tr-body-sm mt-5 max-w-3xl">{bundle.note}</p> : null}
      </div>
    </SectionShell>
  );
}
