import Link from "next/link";
import type { CatalogCategorySlug, MigratedProduct } from "@/data/migrated-products";
import { categoryBuyingGuides } from "@/data/category-buying-guides";
import { SectionShell } from "@/components/storefront/section";
import { FaqList } from "@/components/storefront/faq-list";
import { faqJsonLd, JsonLd } from "@/lib/seo";

export function CategoryBuyingGuide({ slug, products }: { slug: CatalogCategorySlug; products: MigratedProduct[] }) {
  const guide = categoryBuyingGuides[slug];
  const options = guide.options.flatMap((option) => {
    const product = products.find((candidate) => candidate.slug === option.slug);
    return product ? [{ ...option, title: product.title }] : [];
  });
  return (
    <div data-category-guide={slug}>
      <JsonLd data={faqJsonLd(guide.faqs)} />
      <SectionShell spacing="compact">
        <div className="tr-container-narrow">
          <p className="tr-eyebrow">Buying guide</p>
          <h2 className="tr-section-title mt-2">{guide.heading}</h2>
          <p className="tr-body mt-5">{guide.introduction}</p>
          <p className="tr-body mt-4">{guide.decision}</p>
          {options.length > 0 ? <div className="mt-7 grid gap-4 sm:grid-cols-2">
            {options.map((option) => <article className="tr-card p-5" key={option.slug}>
              <h3 className="text-lg font-semibold"><Link className="text-brand underline underline-offset-4" href={`/product/${option.slug}`}>{option.title}</Link></h3>
              <p className="tr-body mt-3">{option.purpose}</p>
              <p className="tr-body-sm mt-2">{option.consideration}</p>
            </article>)}
          </div> : null}
        </div>
      </SectionShell>
      <SectionShell tone="soft" spacing="compact">
        <div className="tr-container-narrow">
          <h2 className="tr-section-title">{guide.setupHeading}</h2>
          <p className="tr-body mt-5">{guide.setup}</p>
          <h3 className="mt-6 text-lg font-semibold">Place the stand where it helps</h3>
          <p className="tr-body mt-3">{guide.placement}</p>
          <nav aria-label="Related category guidance" className="mt-6 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-brand underline underline-offset-4">
            {guide.related.map((link) => <Link key={link.href} href={link.href}>{link.label}</Link>)}
          </nav>
        </div>
      </SectionShell>
      <SectionShell spacing="compact">
        <div className="tr-container-narrow">
          <h2 className="tr-section-title">Questions before choosing your stand</h2>
          <FaqList faqs={guide.faqs} className="mt-7 grid gap-3" />
          <Link href="/pricing" className="mt-6 inline-flex text-sm font-semibold text-brand underline underline-offset-4">Compare current designs and pricing</Link>
        </div>
      </SectionShell>
    </div>
  );
}
