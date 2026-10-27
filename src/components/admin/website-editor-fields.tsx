import type {HomepageThemeContent} from '@/lib/website-content';
import type {WebsiteEditorProps} from './website-editor';
export function MarketingCard({ prefix, title, content }: { prefix: string; title: string; content: WebsiteEditorProps["homepage"]["multilink"] }) {
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

export function ShowcaseImageFields({ prefix, label, image }: { prefix: string; label: string; image: HomepageThemeContent["showcase"]["qualityImage"] }) {
  return <div className="grid gap-3 min-w-0">
    <Input name={`${prefix}-src`} label={`${label} image URL`} defaultValue={image.src} required={false} />
    <Input name={`${prefix}-alt`} label={`${label} image description`} defaultValue={image.alt} required={false} />
    <Input name={`${prefix}-caption`} label={`${label} image caption`} defaultValue={image.caption} required={false} />
  </div>;
}

export function HowItWorksCard({ content }: { content: WebsiteEditorProps["homepage"]["howItWorks"] }) {
  return (
    <EditorCard title="How It Works" description="The customer's NFC tap sequence. Add real video in Homepage Products and Media above.">
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

export function EditorCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-[24px] border border-line bg-white p-5 shadow-sm md:p-7">
      <h2 className="text-xl font-black text-ink">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
      <div className="mt-5 grid gap-4">{children}</div>
    </section>
  );
}

export function Input({ name, label, defaultValue, required = true }: { name: string; label: string; defaultValue: string; required?: boolean }) {
  return (
    <label className="tr-field-label">
      {label}
      <input className="tr-input" name={name} defaultValue={defaultValue} required={required} />
    </label>
  );
}

export function NumberInput({ name, label, defaultValue }: { name: string; label: string; defaultValue: number }) {
  return (
    <label className="tr-field-label">
      {label}
      <input className="tr-input" name={name} type="number" min="0" max="10000" defaultValue={defaultValue} required />
    </label>
  );
}

export function Textarea({ name, label, defaultValue }: { name: string; label: string; defaultValue: string }) {
  return (
    <label className="tr-field-label">
      {label}
      <textarea className="tr-textarea" name={name} defaultValue={defaultValue} required />
    </label>
  );
}

export function Checkbox({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="inline-flex items-center gap-3 text-sm font-bold text-ink">
      <input name={name} type="checkbox" defaultChecked={defaultChecked} className="h-4 w-4 accent-brand" />
      {label}
    </label>
  );
}

export function Select({
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
