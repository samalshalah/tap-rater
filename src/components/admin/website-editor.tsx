"use client";
import {buildPayload} from './website-editor-model';
export {buildPayload} from './website-editor-model';
import {MarketingCard,ShowcaseImageFields,HowItWorksCard,EditorCard,Input,NumberInput,Textarea,Checkbox,Select} from './website-editor-fields';

import { type FormEvent, useState } from "react";
import type {
  FooterContent,
  HeaderNavigationContent,
  HomepageThemeContent
} from "@/lib/website-content";
import type { AdminBusinessUse } from "@/lib/admin-business-uses";

export type WebsiteEditorProps = {
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
    const payload = buildPayload(form, header, footer, homepage);
    const response = await fetch("/api/admin/website", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const body = await response.json().catch(() => ({})) as { error?: string };
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

      <EditorCard title="Homepage Products and Media" description="Featured inventory and the new homepage media. Leave the video URL blank until actual NFC footage is ready. Use captions to identify illustrations or templates.">
        <Checkbox name="showcase-featured-enabled" label="Show featured stands" defaultChecked={homepage.showcase.featuredEnabled} />
        <Input name="showcase-featured-headline" label="Featured heading" defaultValue={homepage.showcase.featuredHeadline} />
        <Input name="showcase-featured-slugs" label="Featured product slugs, up to five, separated by commas" defaultValue={homepage.showcase.featuredProductSlugs.join(", ")} required={false} />
        <Input name="showcase-hero-caption" label="Hero image caption" defaultValue={homepage.showcase.heroCaption} required={false} />
        <Input name="showcase-comparison-product" label="Comparison product slug (prices come from this product)" defaultValue={homepage.showcase.comparisonProductSlug} />
        <div className="grid gap-5 md:grid-cols-2">
          <ShowcaseImageFields prefix="comparison-standard" label="Standard comparison" image={homepage.showcase.comparisonStandard} />
          <ShowcaseImageFields prefix="comparison-branded" label="Branded comparison" image={homepage.showcase.comparisonBranded} />
        </div>
        <Input name="showcase-video" label="Real tap video URL (MP4 or WebM)" defaultValue={homepage.showcase.tapVideoUrl} required={false} />
        <Input name="showcase-poster" label="Video poster image URL" defaultValue={homepage.showcase.tapPosterUrl} required={false} />
        <Input name="showcase-captions" label="Video captions URL (WebVTT)" defaultValue={homepage.showcase.tapCaptionsUrl} required={false} />
        <label className="tr-field-label">Video transcript<textarea name="showcase-transcript" className="tr-textarea" defaultValue={homepage.showcase.tapTranscript} /></label>
        <Checkbox name="showcase-quality-enabled" label="Show product details" defaultChecked={homepage.showcase.qualityEnabled} />
        <Input name="showcase-quality-headline" label="Product details heading" defaultValue={homepage.showcase.qualityHeadline} />
        <ShowcaseImageFields prefix="quality" label="Product details" image={homepage.showcase.qualityImage} />
        {Array.from({ length: 5 }, (_, index) => homepage.showcase.scenes[index] ?? { slug: "", title: "", body: "", productSlug: "", image: { src: "", alt: "", caption: "" } }).map((scene, index) => <fieldset key={index} className="grid gap-4 border-t border-line pt-5">
          <legend className="font-semibold">Business scene {index + 1}</legend>
          <Select name={`scene-${index}-slug`} label="Business use" defaultValue={scene.slug} options={businessUses.filter((item) => item.isActive).map((item) => ({ label: item.title, value: item.slug }))} placeholder="None" />
          <Input name={`scene-${index}-title`} label="Title" defaultValue={scene.title} required={false} />
          <Input name={`scene-${index}-body`} label="Description" defaultValue={scene.body} required={false} />
          <Input name={`scene-${index}-product`} label="Fallback product slug" defaultValue={scene.productSlug} required={false} />
          <ShowcaseImageFields prefix={`scene-${index}`} label="Optional scene override" image={scene.image} />
        </fieldset>)}
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
      </EditorCard>

      <MarketingCard prefix="multilink" title="Multi-Link" content={homepage.multilink} />
      <HowItWorksCard content={homepage.howItWorks} />
      <EditorCard title="Standard or Branded Comparison" description="Comparison images, product selection, and live prices are configured above.">
        <Checkbox name="custom-branding-enabled" label="Show comparison" defaultChecked={homepage.customBranding.enabled} />
        <Input name="custom-branding-eyebrow" label="Eyebrow" defaultValue={homepage.customBranding.eyebrow} required={false} />
        <Input name="custom-branding-headline" label="Heading" defaultValue={homepage.customBranding.headline} />
        <Textarea name="custom-branding-body" label="Preview approval explanation" defaultValue={homepage.customBranding.body} />
      </EditorCard>

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
