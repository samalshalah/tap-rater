"use client";

import { type FormEvent, useState } from "react";
import type {
  FaqContent,
  FooterContent,
  HeaderNavigationContent,
  HomepageThemeContent
} from "@/lib/website-content";
import type { AdminBusinessUse } from "@/lib/admin-business-uses";

type WebsiteEditorProps = {
  businessUses: AdminBusinessUse[];
  header: HeaderNavigationContent;
  footer: FooterContent;
  homepage: HomepageThemeContent;
};

export function WebsiteEditor({ businessUses, header, footer, homepage }: WebsiteEditorProps) {
  const [status, setStatus] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = buildPayload(form, header, footer, homepage.faqs);
    const response = await fetch("/api/admin/website", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const body = await response.json().catch(() => ({}));
    setStatus(response.ok ? "Website content saved. Public pages update immediately after route revalidation." : body.error ?? "Website save failed.");
  }

  return (
    <form className="grid gap-6" onSubmit={submit}>
      <EditorCard title="Homepage Hero" description="Top homepage message, image, proof points, and calls to action.">
        <Checkbox name="hero-enabled" label="Show hero" defaultChecked={homepage.hero.enabled} />
        <Input name="hero-eyebrow" label="Eyebrow" defaultValue={homepage.hero.eyebrow} />
        <Input name="hero-headline" label="Headline" defaultValue={homepage.hero.headline} />
        <Textarea name="hero-body" label="Supporting text" defaultValue={homepage.hero.body} />
        <div className="grid gap-4 md:grid-cols-2">
          <Input name="hero-primary-label" label="Primary CTA label" defaultValue={homepage.hero.primaryCta.label} />
          <Input name="hero-primary-href" label="Primary CTA URL" defaultValue={homepage.hero.primaryCta.href} />
          <Input name="hero-secondary-label" label="Secondary CTA label" defaultValue={homepage.hero.secondaryCta?.label ?? ""} required={false} />
          <Input name="hero-secondary-href" label="Secondary CTA URL" defaultValue={homepage.hero.secondaryCta?.href ?? ""} required={false} />
        </div>
        <Input name="hero-image-src" label="Hero image URL" defaultValue={homepage.hero.image.src} />
        <Input name="hero-image-alt" label="Hero image alt text" defaultValue={homepage.hero.image.alt} required={false} />
        <Input name="hero-proof-points" label="Proof points, separated by commas" defaultValue={homepage.hero.proofPoints.join(", ")} required={false} />
      </EditorCard>

      <EditorCard title="Shop by Action" description="Controlled action cards shown on the homepage.">
        <Checkbox name="actions-enabled" label="Show action cards" defaultChecked={homepage.actions.enabled} />
        <Input name="actions-eyebrow" label="Section eyebrow" defaultValue={homepage.actions.eyebrow} />
        <Input name="actions-headline" label="Section headline" defaultValue={homepage.actions.headline} />
        <div className="grid gap-4 lg:grid-cols-2">
          {homepage.actions.items.slice(0, 6).map((item, index) => (
            <div key={`${item.title}-${index}`} className="rounded-xl border border-line bg-soft p-4">
              <Checkbox name={`action-${index}-enabled`} label="Show card" defaultChecked={item.enabled} />
              <Input name={`action-${index}-title`} label="Title" defaultValue={item.title} />
              <Textarea name={`action-${index}-description`} label="Description" defaultValue={item.description} />
              <Input name={`action-${index}-href`} label="Link" defaultValue={item.href} />
              <Input name={`action-${index}-image-src`} label="Image URL" defaultValue={item.image.src} />
              <Input name={`action-${index}-image-alt`} label="Image alt text" defaultValue={item.image.alt} required={false} />
              <NumberInput name={`action-${index}-order`} label="Order" defaultValue={item.order} />
            </div>
          ))}
        </div>
      </EditorCard>

      <EditorCard title="Industries / Use Cases" description="Feature existing Business Use records on the homepage.">
        <Checkbox name="featured-uses-enabled" label="Show featured use cases" defaultChecked={homepage.featuredUses.enabled} />
        <Input name="featured-uses-eyebrow" label="Section eyebrow" defaultValue={homepage.featuredUses.eyebrow} />
        <Input name="featured-uses-headline" label="Section headline" defaultValue={homepage.featuredUses.headline} />
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Select
              key={`featured-use-${index}`}
              name={`featured-use-${index}`}
              label={`Featured use ${index + 1}`}
              defaultValue={homepage.featuredUses.businessUseSlugs[index] ?? ""}
              options={businessUses.filter((businessUse) => businessUse.isActive).map((businessUse) => ({ label: businessUse.title, value: businessUse.slug }))}
              placeholder="None"
            />
          ))}
        </div>
      </EditorCard>

      <MarketingCard prefix="multilink" title="Multi-Link" content={homepage.multilink} />
      <HowItWorksCard content={homepage.howItWorks} />
      <MarketingCard prefix="custom-branding" title="Custom Branding" content={homepage.customBranding} />

      <EditorCard title="Final CTA" description="Bottom homepage call to action.">
        <Checkbox name="final-cta-enabled" label="Show final CTA" defaultChecked={homepage.finalCta.enabled} />
        <Input name="final-cta-eyebrow" label="Eyebrow" defaultValue={homepage.finalCta.eyebrow} />
        <Input name="final-cta-headline" label="Headline" defaultValue={homepage.finalCta.headline} />
        <div className="grid gap-4 md:grid-cols-2">
          <Input name="final-cta-primary-label" label="Primary CTA label" defaultValue={homepage.finalCta.primaryCta.label} />
          <Input name="final-cta-primary-href" label="Primary CTA URL" defaultValue={homepage.finalCta.primaryCta.href} />
          <Input name="final-cta-secondary-label" label="Secondary CTA label" defaultValue={homepage.finalCta.secondaryCta?.label ?? ""} required={false} />
          <Input name="final-cta-secondary-href" label="Secondary CTA URL" defaultValue={homepage.finalCta.secondaryCta?.href ?? ""} required={false} />
        </div>
      </EditorCard>

      <EditorCard title="Header Navigation" description="Public header menu labels, links, order, and visibility. Cart and Account remain code-controlled.">
        <div className="grid gap-4 lg:grid-cols-2">
          {header.items.slice(0, 8).map((item, index) => (
            <div key={`${item.href}-${index}`} className="rounded-xl border border-line bg-soft p-4">
              <Checkbox name={`nav-${index}-enabled`} label="Show item" defaultChecked={item.enabled} />
              <Input name={`nav-${index}-label`} label="Label" defaultValue={item.label} />
              <Input name={`nav-${index}-href`} label="Destination" defaultValue={item.href} />
              <NumberInput name={`nav-${index}-order`} label="Order" defaultValue={item.order} />
            </div>
          ))}
        </div>
      </EditorCard>

      <EditorCard title="Footer" description="Footer intro and grouped public links.">
        <Textarea name="footer-intro" label="Footer intro" defaultValue={footer.intro} />
        <div className="grid gap-4 lg:grid-cols-2">
          {footer.columns.slice(0, 4).map((column, columnIndex) => (
            <div key={`${column.label}-${columnIndex}`} className="rounded-xl border border-line bg-soft p-4">
              <Input name={`footer-${columnIndex}-label`} label="Column label" defaultValue={column.label} />
              <NumberInput name={`footer-${columnIndex}-order`} label="Column order" defaultValue={column.order} />
              {column.links.slice(0, 6).map((link, linkIndex) => (
                <div key={`${link.href}-${linkIndex}`} className="mt-4 border-t border-line pt-4">
                  <Checkbox name={`footer-${columnIndex}-${linkIndex}-enabled`} label="Show link" defaultChecked={link.enabled} />
                  <Input name={`footer-${columnIndex}-${linkIndex}-label`} label="Link label" defaultValue={link.label} />
                  <Input name={`footer-${columnIndex}-${linkIndex}-href`} label="Link URL" defaultValue={link.href} />
                  <NumberInput name={`footer-${columnIndex}-${linkIndex}-order`} label="Link order" defaultValue={link.order} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </EditorCard>

      <EditorCard title="FAQs" description="Global FAQ items used on the homepage and FAQ page.">
        <div className="grid gap-4">
          {homepage.faqs.items.slice(0, 8).map((faq, index) => (
            <div key={`${faq.question}-${index}`} className="rounded-xl border border-line bg-soft p-4">
              <Checkbox name={`faq-${index}-enabled`} label="Show FAQ" defaultChecked={faq.enabled} />
              <Input name={`faq-${index}-question`} label="Question" defaultValue={faq.question} />
              <Textarea name={`faq-${index}-answer`} label="Answer" defaultValue={faq.answer} />
              <Select name={`faq-${index}-area`} label="Area" defaultValue={faq.area} options={["global", "product", "multilink", "shipping"]} />
              <NumberInput name={`faq-${index}-order`} label="Order" defaultValue={faq.order} />
            </div>
          ))}
        </div>
      </EditorCard>

      <div className="sticky bottom-0 z-10 rounded-2xl border border-line bg-white p-4 shadow-[0_-18px_42px_rgba(16,32,30,0.08)]">
        <button className="tr-button-primary w-full sm:w-auto" type="submit">Save Website Content</button>
        {status ? <p className="mt-3 text-sm font-semibold text-ink">{status}</p> : null}
      </div>
    </form>
  );
}

function MarketingCard({ prefix, title, content }: { prefix: string; title: string; content: WebsiteEditorProps["homepage"]["multilink"] }) {
  return (
    <EditorCard title={title} description={`${title} marketing copy and showcase image.`}>
      <Checkbox name={`${prefix}-enabled`} label={`Show ${title}`} defaultChecked={content.enabled} />
      <Input name={`${prefix}-eyebrow`} label="Eyebrow" defaultValue={content.eyebrow} required={false} />
      <Input name={`${prefix}-headline`} label="Headline" defaultValue={content.headline} />
      <Textarea name={`${prefix}-body`} label="Supporting text" defaultValue={content.body} />
      <Input name={`${prefix}-cta-label`} label="CTA label" defaultValue={content.cta.label} />
      <Input name={`${prefix}-cta-href`} label="CTA URL" defaultValue={content.cta.href} />
      <Input name={`${prefix}-image-src`} label="Showcase image URL" defaultValue={content.image.src} />
      <Input name={`${prefix}-image-alt`} label="Image alt text" defaultValue={content.image.alt} required={false} />
      <Input name={`${prefix}-bullets`} label="Bullets, separated by commas" defaultValue={content.bullets.join(", ")} required={false} />
    </EditorCard>
  );
}

function HowItWorksCard({ content }: { content: WebsiteEditorProps["homepage"]["howItWorks"] }) {
  return (
    <EditorCard title="How It Works" description="Simple approved three-step explanation.">
      <Checkbox name="how-enabled" label="Show How It Works" defaultChecked={content.enabled} />
      <Input name="how-eyebrow" label="Eyebrow" defaultValue={content.eyebrow} />
      <Input name="how-headline" label="Headline" defaultValue={content.headline} />
      <div className="grid gap-4 md:grid-cols-3">
        {content.steps.slice(0, 3).map((step, index) => (
          <div key={`${step.title}-${index}`} className="rounded-xl border border-line bg-soft p-4">
            <Input name={`how-${index}-title`} label="Step title" defaultValue={step.title} />
            <Textarea name={`how-${index}-description`} label="Step description" defaultValue={step.description} />
            <Select name={`how-${index}-icon`} label="Icon" defaultValue={step.icon} options={["shop", "link", "truck"]} />
            <NumberInput name={`how-${index}-order`} label="Order" defaultValue={step.order} />
          </div>
        ))}
      </div>
    </EditorCard>
  );
}

function EditorCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[24px] border border-line bg-white p-5 shadow-sm md:p-7">
      <h2 className="text-xl font-black text-ink">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
      <div className="mt-5 grid gap-4">{children}</div>
    </section>
  );
}

function Input({ name, label, defaultValue, required = true }: { name: string; label: string; defaultValue: string; required?: boolean }) {
  return (
    <label className="tr-field-label">
      {label}
      <input className="tr-input" name={name} defaultValue={defaultValue} required={required} />
    </label>
  );
}

function NumberInput({ name, label, defaultValue }: { name: string; label: string; defaultValue: number }) {
  return (
    <label className="tr-field-label">
      {label}
      <input className="tr-input" name={name} type="number" min="0" max="10000" defaultValue={defaultValue} required />
    </label>
  );
}

function Textarea({ name, label, defaultValue }: { name: string; label: string; defaultValue: string }) {
  return (
    <label className="tr-field-label">
      {label}
      <textarea className="tr-textarea" name={name} defaultValue={defaultValue} required />
    </label>
  );
}

function Checkbox({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="inline-flex items-center gap-3 text-sm font-bold text-ink">
      <input name={name} type="checkbox" defaultChecked={defaultChecked} className="h-4 w-4 accent-brand" />
      {label}
    </label>
  );
}

function Select({
  defaultValue,
  label,
  name,
  options,
  placeholder
}: {
  defaultValue: string;
  label: string;
  name: string;
  options: Array<string | { label: string; value: string }>;
  placeholder?: string;
}) {
  return (
    <label className="tr-field-label">
      {label}
      <select className="tr-input" name={name} defaultValue={defaultValue}>
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          typeof option === "string" ? (
            <option key={option} value={option}>{option}</option>
          ) : (
            <option key={option.value} value={option.value}>{option.label}</option>
          )
        ))}
      </select>
    </label>
  );
}

function text(form: FormData, name: string) {
  return String(form.get(name) ?? "").trim();
}

function num(form: FormData, name: string) {
  return Number(form.get(name) ?? 0);
}

function enabled(form: FormData, name: string) {
  return form.get(name) === "on";
}

function splitList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function optionalCta(label: string, href: string) {
  return label && href ? { label, href } : undefined;
}

function buildPayload(form: FormData, header: HeaderNavigationContent, footer: FooterContent, faqs: FaqContent) {
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
      businessUseSlugs: Array.from({ length: 6 }).map((_, index) => text(form, `featured-use-${index}`)).filter(Boolean)
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
    customBranding: marketingPayload(form, "custom-branding"),
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

function marketingPayload(form: FormData, prefix: string) {
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
