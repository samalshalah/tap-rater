import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Bell, Check, ExternalLink, Smartphone } from "lucide-react";
import type { MigratedProduct } from "@/data/migrated-products";
import type { BusinessUse } from "@/lib/catalog-architecture";
import { ProductCard } from "@/components/product/product-card";
import { FaqList } from "@/components/storefront/faq-list";
import { HomepageBrowseCard } from "@/components/storefront/homepage-browse-card";
import { getProductSpecifications } from "@/lib/product-page-content";
import { getProductPurchaseOptions, isHostedPurchaseOptionEnabled } from "@/lib/purchase-options";
import { formatPrice } from "@/lib/products";
import { hostedMultiLinkServiceAddon } from "@/lib/service-addons";
import { selectFeaturedHomepageProducts } from "@/lib/homepage-showcase";
import { multiLinkDemoImage } from "@/lib/marketing-images";
import { optimizedUploadSrc } from "@/lib/optimized-upload";
import { getProductVisual } from "@/lib/storefront-visuals";
import { type HomepageThemeContent, orderedEnabledFaqs } from "@/lib/website-content";
import styles from "./homepage-layout.module.css";

const compactPrice = (cents: number) => formatPrice(cents).replace(/\.00$/, "");

export function HomepageLayout({ content, products, businessUses = [] }: { content: HomepageThemeContent; products: MigratedProduct[]; businessUses?: BusinessUse[] }) {
  const { showcase } = content;
  const featured = selectFeaturedHomepageProducts(products, showcase.featuredProductSlugs);
  const standardPrices = products.filter((product) => product.isActive).flatMap((product) =>
    getProductPurchaseOptions(product).filter((option) => option.id === "standard_direct").map((option) => option.priceCents)
  );
  const comparisonProduct = products.find((product) => product.slug === showcase.comparisonProductSlug && product.isActive);
  const comparisonOptions = comparisonProduct ? getProductPurchaseOptions(comparisonProduct) : [];
  const standard = comparisonOptions.find((option) => option.id === "standard_direct");
  const branded = comparisonOptions.find((option) => option.id === "branded_qr_direct");
  const specifications = comparisonProduct ? getProductSpecifications(comparisonProduct) : [];
  const faqs = orderedEnabledFaqs(content.faqs, "global").slice(0, 8);
  const actions = content.actions.items.filter((item) => item.enabled).sort((a, b) => a.order - b.order);

  return <div className={styles.home}>
    {content.hero.enabled ? <section className={styles.hero} aria-labelledby="home-title" data-home-section="hero">
      <div className={styles.heroMedia}>
        <Image src={optimizedUploadSrc(content.hero.image.src, 1200)} alt={content.hero.image.alt} fill unoptimized fetchPriority="high" loading="eager" sizes="100vw" className={styles.heroImage} />
        {showcase.heroCaption ? <p className={styles.heroCaption}>{showcase.heroCaption}</p> : null}
      </div>
      <div className={styles.heroInner}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>{content.hero.eyebrow}</p>
          <h1 id="home-title">{content.hero.headline}</h1>
          <p className={styles.heroBody}>{content.hero.body}</p>
          {standardPrices.length ? <p className={styles.heroPrice}>From <strong>{compactPrice(Math.min(...standardPrices))}</strong><span>per stand</span></p> : null}
          <div className={styles.ctas}>
            <Link className="tr-button-primary" href={content.hero.primaryCta.href}>{content.hero.primaryCta.label}<ArrowRight size={17} aria-hidden="true" /></Link>
            {content.hero.secondaryCta ? <Link className={styles.textLink} href={content.hero.secondaryCta.href}>{content.hero.secondaryCta.label}<ArrowRight size={16} aria-hidden="true" /></Link> : null}
          </div>
          <ul className={styles.heroProof}>{content.hero.proofPoints.map((point) => <li key={point}><Check size={15} aria-hidden="true" />{point}</li>)}</ul>
        </div>
      </div>
    </section> : null}

    {content.actions.enabled && actions.length ? <section className={styles.section} aria-labelledby="home-actions" data-home-section="actions">
      <div className={styles.container}>
        <Heading id="home-actions" eyebrow={content.actions.eyebrow} title={content.actions.headline} />
        <div className={`${styles.cards} ${styles.categoryCards} grid divide-y divide-line lg:grid-cols-2 lg:gap-5 lg:divide-y-0 xl:grid-cols-5`} data-home-category-cards>
          {actions.map((item) => <HomepageBrowseCard key={item.href} href={item.href} title={item.title} description={item.description} image={item.image} variant="type" />)}
        </div>
      </div>
    </section> : null}

    {showcase.featuredEnabled && featured.length ? <section className={`${styles.section} ${styles.soft}`} aria-labelledby="home-featured" data-home-section="featured">
      <div className={styles.container}>
        <Heading id="home-featured" eyebrow="Made for your counter" title={showcase.featuredHeadline} href="/shop" link="View all stands" />
        <div className={`${styles.cards} ${styles.products}`} data-home-featured-products>{featured.map((product) => <ProductCard key={product.slug} product={product} />)}</div>
      </div>
    </section> : null}

    {content.customBranding.enabled && comparisonProduct && standard && branded ? <section className={styles.section} aria-labelledby="home-designs" data-home-section="comparison">
      <div className={styles.container}>
        <Heading id="home-designs" eyebrow={content.customBranding.eyebrow} title={content.customBranding.headline} />
        <div className={styles.comparison}>
          {[
            { name: "Standard", option: standard, image: showcase.comparisonStandard, detail: "NFC-only. No printed QR.", points: ["Ready-made Tap Rater design", "One destination link", "No subscription for Direct"], href: `/product/${comparisonProduct.slug}`, cta: "Shop Standard" },
            { name: "Branded", option: branded, image: showcase.comparisonBranded, detail: "Your logo, business name, NFC + QR.", points: ["Your logo and business name", "QR generated from your destination", "Approve the preview before payment"], href: `/product/${comparisonProduct.slug}?design=branded`, cta: "Customize Yours" }
          ].map((design) => <article key={design.name} className={styles.design}>
            <figure>
              <div className={styles.designImage}><Photo src={design.image.src} alt={design.image.alt} /></div>
              {design.image.caption ? <figcaption>{design.image.caption}</figcaption> : null}
            </figure>
            <div className={styles.designCopy}>
              <div className={styles.designTitle}><h3>{design.name}</h3><strong>{compactPrice(design.option.priceCents)}</strong></div>
              <p>{design.detail}</p>
              <ul className={styles.checkList}>{design.points.map((point) => <li key={point}><Check size={16} aria-hidden="true" />{point}</li>)}</ul>
              <Link href={design.href} className={styles.textLink}>{design.cta}<ArrowRight size={17} aria-hidden="true" /></Link>
            </div>
          </article>)}
        </div>
        <p className={styles.comparisonNote}>{content.customBranding.body}</p>
      </div>
    </section> : null}

    {content.howItWorks.enabled ? <section className={`${styles.section} ${styles.tap}`} aria-labelledby="home-tap" data-home-section="tap">
      <div className={styles.container}>
        <Heading id="home-tap" eyebrow={content.howItWorks.eyebrow} title={showcase.tapVideoUrl ? "See an actual tap." : content.howItWorks.headline} />
        {showcase.tapVideoUrl ? <figure className={styles.video}>
          <video controls playsInline preload="none" poster={showcase.tapPosterUrl || undefined} aria-label="Tap Rater NFC demonstration">
            <source src={showcase.tapVideoUrl} />
            {showcase.tapCaptionsUrl ? <track kind="captions" src={showcase.tapCaptionsUrl} srcLang="en" label="English" default /> : null}
            Your browser does not support this video. <a href={showcase.tapVideoUrl}>Open the demonstration</a>.
          </video>
          {showcase.tapTranscript ? <details className={styles.transcript}><summary>Video transcript</summary><p>{showcase.tapTranscript}</p></details> : null}
        </figure> : null}
        <ol className={styles.tapSteps}>
          {content.howItWorks.steps.slice().sort((a, b) => a.order - b.order).map((step, index) => {
            const Icon = { shop: Smartphone, link: Bell, truck: ExternalLink }[step.icon];
            return <li key={step.title}>
              <div className={styles.stepNumber}><Icon size={25} aria-hidden="true" /><span>0{index + 1}</span></div><h3>{step.title}</h3><p>{step.description}</p>
            </li>;
          })}
        </ol>
        <Link href="/how-it-works" className={styles.textLink}>More about NFC and setup<ArrowRight size={16} aria-hidden="true" /></Link>
      </div>
    </section> : null}

    {content.multilink.enabled && isHostedPurchaseOptionEnabled() ? <section className={styles.section} aria-labelledby="home-multilink" data-home-section="multilink">
      <div className={`${styles.container} ${styles.mediaRow}`}>
        <figure className={styles.multiImage}><div><Photo src={content.multilink.image.src} alt={content.multilink.image.alt} /></div>{content.multilink.image.src === multiLinkDemoImage.src ? <figcaption>{multiLinkDemoImage.caption}</figcaption> : null}</figure>
        <div>
          <Heading id="home-multilink" eyebrow={content.multilink.eyebrow} title={content.multilink.headline} />
          <p className={styles.body}>{content.multilink.body}</p>
          {content.multilink.bullets.length ? <ul className={`${styles.checkList} ${styles.multiBullets}`}>{content.multilink.bullets.map((bullet) => <li key={bullet}><Check size={16} aria-hidden="true" />{bullet}</li>)}</ul> : null}
          <p className={styles.multiPrice}><strong>{formatPrice(hostedMultiLinkServiceAddon.monthlyPriceCents)}</strong><span>/month per page<br />plus the physical stand</span></p>
          <p className={styles.directNote}>Only need one destination? Choose Direct. No subscription required.</p>
          <Link href={content.multilink.cta.href} className={styles.textLink}>{content.multilink.cta.label}<ArrowRight size={17} aria-hidden="true" /></Link>
        </div>
      </div>
    </section> : null}

    {content.featuredUses.enabled && showcase.scenes.length ? <section className={`${styles.section} ${styles.soft}`} aria-labelledby="home-business" data-home-section="business">
      <div className={styles.container}>
        <Heading id="home-business" eyebrow={content.featuredUses.eyebrow} title={content.featuredUses.headline} href="/solutions" link="Explore business uses" />
        <div className={`${styles.cards} ${styles.businessCards} grid divide-y divide-line lg:grid-cols-2 lg:gap-5 lg:divide-y-0 xl:grid-cols-5`} data-home-business-cards>{showcase.scenes.map((scene) => {
          const product = products.find((item) => item.slug === scene.productSlug && item.isActive);
          const businessUse = businessUses.find((item) => item.slug === scene.slug && item.isActive);
          const businessImage = businessUse?.bannerImageUrl || businessUse?.imageUrl;
          const src = scene.image.src || businessImage || (product ? getProductVisual(product).src : "");
          const alt = !scene.image.src && businessImage ? `${businessUse!.title} business-use image` : scene.image.alt;
          const caption = !scene.image.src && businessImage ? "" : scene.image.caption;
          if (!src) return null;
          return <article key={scene.slug} className="min-w-0">
            <HomepageBrowseCard href={`/solutions/${scene.slug}`} title={scene.title} description={scene.body} image={{ src, alt }} variant="use-case" />
            {caption ? <p className={styles.caption}>{caption}</p> : null}
          </article>;
        })}</div>
      </div>
    </section> : null}

    {showcase.qualityEnabled && comparisonProduct ? <section className={styles.section} aria-labelledby="home-quality" data-home-section="quality">
      <div className={`${styles.container} ${styles.quality}`}>
        <figure><div className={styles.qualityImage}><Photo src={showcase.qualityImage.src || getProductVisual(comparisonProduct).src} alt={showcase.qualityImage.alt} /></div>{showcase.qualityImage.caption ? <figcaption>{showcase.qualityImage.caption}</figcaption> : null}</figure>
        <div><Heading id="home-quality" eyebrow="Product details" title={showcase.qualityHeadline} />
          <p className={styles.body}>Acrylic. A compact countertop base. A clear invitation to connect.</p>
          <dl className={styles.specifications}>{specifications.map((spec) => <div key={spec.label}><dt>{spec.label}</dt><dd>{spec.value}</dd></div>)}</dl>
          <p className={styles.boxNote}>In the box: one stand.</p>
          <Link href={`/product/${comparisonProduct.slug}`} className={styles.textLink}>Explore the stand<ArrowRight size={16} aria-hidden="true" /></Link>
        </div>
      </div>
    </section> : null}

    {faqs.length || content.finalCta.enabled ? <section className={`${styles.section} ${styles.soft}`} aria-labelledby={faqs.length ? "home-faqs" : "home-final"} data-home-section="questions">
      <div className={styles.container}>
        {faqs.length ? <div className={styles.faqRow}><Heading id="home-faqs" eyebrow="Before you choose" title="A few good questions." /><FaqList faqs={faqs} className={styles.faqs} /></div> : null}
        {content.finalCta.enabled ? <div className={styles.final}>
          <h2 id="home-final">{content.finalCta.headline}</h2>
          <div className={styles.ctas}><Link className="tr-button-primary" href={content.finalCta.primaryCta.href}>{content.finalCta.primaryCta.label}<ArrowRight size={17} aria-hidden="true" /></Link>{content.finalCta.secondaryCta ? <Link className={styles.textLink} href={content.finalCta.secondaryCta.href}>{content.finalCta.secondaryCta.label}<ArrowRight size={16} aria-hidden="true" /></Link> : null}</div>
        </div> : null}
      </div>
    </section> : null}
  </div>;
}

function Photo({ src, alt, size = 1200 }: { src: string; alt: string; size?: 640 | 1200 }) {
  return <Image src={optimizedUploadSrc(src, size)} alt={alt} fill unoptimized sizes={size === 640 ? "(min-width: 1024px) 25vw, 50vw" : "(min-width: 1024px) 50vw, 100vw"} className={styles.photo} />;
}

function Heading({ id, eyebrow, title, href, link }: { id: string; eyebrow: string; title: string; href?: string; link?: string }) {
  return <div className={styles.heading}><div><p className={styles.eyebrow}>{eyebrow}</p><h2 id={id}>{title}</h2></div>{href && link ? <Link href={href} className={styles.textLink}>{link}<ArrowRight size={16} aria-hidden="true" /></Link> : null}</div>;
}
