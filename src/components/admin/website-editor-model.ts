import type {FooterContent,HeaderNavigationContent,HomepageThemeContent} from '@/lib/website-content';
export function showcaseImage(form: FormData, prefix: string) {
  return { src: text(form, `${prefix}-src`), alt: text(form, `${prefix}-alt`), caption: text(form, `${prefix}-caption`) };
}

export function text(form: FormData, name: string) {
  return String(form.get(name) ?? "").trim();
}

export function num(form: FormData, name: string) {
  return Number(form.get(name) ?? 0);
}

export function enabled(form: FormData, name: string) {
  return form.get(name) === "on";
}

export function splitList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

export function optionalCta(label: string, href: string) {
  return label && href ? { label, href } : undefined;
}

export function buildPayload(form: FormData, header: HeaderNavigationContent, footer: FooterContent, homepage: HomepageThemeContent) {
  const faqs = homepage.faqs;
  const actions = Array.from({ length: Math.min(6, 6) }).flatMap((_, index) => {
    const title = text(form, `action-${index}-title`);
    const href = text(form, `action-${index}-href`);
    const imageSrc = text(form, `action-${index}-image-src`);
    if (!title || !href || !imageSrc) return [];
    return [{
      title,
      description: text(form, `action-${index}-description`),
      href,
      image: { src: imageSrc, alt: text(form, `action-${index}-image-alt`) },
      order: num(form, `action-${index}-order`),
      enabled: enabled(form, `action-${index}-enabled`)
    }];
  });

  return {
    showcase: {
      featuredEnabled: enabled(form, "showcase-featured-enabled"),
      featuredHeadline: text(form, "showcase-featured-headline"),
      featuredProductSlugs: splitList(text(form, "showcase-featured-slugs")),
      heroCaption: text(form, "showcase-hero-caption"),
      comparisonProductSlug: text(form, "showcase-comparison-product"),
      comparisonStandard: showcaseImage(form, "comparison-standard"),
      comparisonBranded: showcaseImage(form, "comparison-branded"),
      tapVideoUrl: text(form, "showcase-video"),
      tapPosterUrl: text(form, "showcase-poster"),
      tapCaptionsUrl: text(form, "showcase-captions"),
      tapTranscript: text(form, "showcase-transcript"),
      qualityEnabled: enabled(form, "showcase-quality-enabled"),
      qualityHeadline: text(form, "showcase-quality-headline"),
      qualityImage: showcaseImage(form, "quality"),
      scenes: Array.from({ length: 5 }).flatMap((_, index) => {
        const slug = text(form, `scene-${index}-slug`);
        return slug ? [{ slug, title: text(form, `scene-${index}-title`), body: text(form, `scene-${index}-body`), productSlug: text(form, `scene-${index}-product`), image: showcaseImage(form, `scene-${index}`) }] : [];
      })
    },
    hero: {
      enabled: enabled(form, "hero-enabled"),
      eyebrow: text(form, "hero-eyebrow"),
      headline: text(form, "hero-headline"),
      body: text(form, "hero-body"),
      primaryCta: { label: text(form, "hero-primary-label"), href: text(form, "hero-primary-href") },
      secondaryCta: optionalCta(text(form, "hero-secondary-label"), text(form, "hero-secondary-href")),
      proofPoints: splitList(text(form, "hero-proof-points")),
      image: { src: text(form, "hero-image-src"), alt: text(form, "hero-image-alt") }
    },
    actions: {
      enabled: enabled(form, "actions-enabled"),
      eyebrow: text(form, "actions-eyebrow"),
      headline: text(form, "actions-headline"),
      items: actions
    },
    featuredUses: {
      enabled: enabled(form, "featured-uses-enabled"),
      eyebrow: text(form, "featured-uses-eyebrow"),
      headline: text(form, "featured-uses-headline"),
      businessUseSlugs: Array.from({ length: 5 }).map((_, index) => text(form, `scene-${index}-slug`)).filter(Boolean)
    },
    multilink: marketingPayload(form, "multilink"),
    howItWorks: {
      enabled: enabled(form, "how-enabled"),
      eyebrow: text(form, "how-eyebrow"),
      headline: text(form, "how-headline"),
      steps: [0, 1, 2].map((index) => ({
        title: text(form, `how-${index}-title`),
        description: text(form, `how-${index}-description`),
        icon: text(form, `how-${index}-icon`),
        order: num(form, `how-${index}-order`)
      }))
    },
    customBranding: {
      ...homepage.customBranding,
      enabled: enabled(form, "custom-branding-enabled"),
      eyebrow: text(form, "custom-branding-eyebrow"),
      headline: text(form, "custom-branding-headline"),
      body: text(form, "custom-branding-body")
    },
    finalCta: {
      enabled: enabled(form, "final-cta-enabled"),
      eyebrow: text(form, "final-cta-eyebrow"),
      headline: text(form, "final-cta-headline"),
      primaryCta: { label: text(form, "final-cta-primary-label"), href: text(form, "final-cta-primary-href") },
      secondaryCta: optionalCta(text(form, "final-cta-secondary-label"), text(form, "final-cta-secondary-href"))
    },
    header: {
      items: header.items.slice(0, 8).map((_, index) => ({
        label: text(form, `nav-${index}-label`),
        href: text(form, `nav-${index}-href`),
        order: num(form, `nav-${index}-order`),
        enabled: enabled(form, `nav-${index}-enabled`)
      }))
    },
    footer: {
      intro: text(form, "footer-intro"),
      columns: footer.columns.slice(0, 4).map((column, columnIndex) => ({
        label: text(form, `footer-${columnIndex}-label`),
        order: num(form, `footer-${columnIndex}-order`),
        links: column.links.slice(0, 6).map((_, linkIndex) => ({
          label: text(form, `footer-${columnIndex}-${linkIndex}-label`),
          href: text(form, `footer-${columnIndex}-${linkIndex}-href`),
          order: num(form, `footer-${columnIndex}-${linkIndex}-order`),
          enabled: enabled(form, `footer-${columnIndex}-${linkIndex}-enabled`)
        }))
      }))
    },
    faqs: {
      items: faqs.items.slice(0, 8).map((_, index) => ({
        question: text(form, `faq-${index}-question`),
        answer: text(form, `faq-${index}-answer`),
        area: text(form, `faq-${index}-area`),
        order: num(form, `faq-${index}-order`),
        enabled: enabled(form, `faq-${index}-enabled`)
      }))
    }
  };
}

export function marketingPayload(form: FormData, prefix: string) {
  return {
    enabled: enabled(form, `${prefix}-enabled`),
    eyebrow: text(form, `${prefix}-eyebrow`),
    headline: text(form, `${prefix}-headline`),
    body: text(form, `${prefix}-body`),
    cta: { label: text(form, `${prefix}-cta-label`), href: text(form, `${prefix}-cta-href`) },
    image: { src: text(form, `${prefix}-image-src`), alt: text(form, `${prefix}-image-alt`) },
    bullets: splitList(text(form, `${prefix}-bullets`))
  };
}
