"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { MigratedProduct } from "@/data/migrated-products";
import type { AdminBusinessUse } from "@/lib/admin-business-uses";
import { businessUseGuideSchema, defaultBusinessUseGuide, type BusinessUseGuide } from "@/lib/business-use-guide";

type BusinessUseEditorProps = {
  businessUse: AdminBusinessUse;
  products: MigratedProduct[];
  mode: "create" | "edit";
};

export function BusinessUseEditor({ businessUse, mode, products }: BusinessUseEditorProps) {
  const router = useRouter();
  const [form, setForm] = useState({
    originalSlug: mode === "edit" ? businessUse.slug : "",
    slug: businessUse.slug,
    title: businessUse.title,
    description: businessUse.description,
    shortDescription: businessUse.shortDescription ?? "",
    longContent: businessUse.longContent ?? "",
    seoTitle: businessUse.seoTitle ?? businessUse.guide?.seoTitle ?? defaultBusinessUseGuide(businessUse.slug).seoTitle ?? "",
    seoDescription: businessUse.seoDescription ?? businessUse.guide?.seoDescription ?? defaultBusinessUseGuide(businessUse.slug).seoDescription ?? "",
    imageUrl: businessUse.imageUrl ?? "",
    bannerImageUrl: businessUse.bannerImageUrl ?? "",
    sortOrder: businessUse.sortOrder,
    isActive: businessUse.isActive,
    productSlugs: businessUse.productSlugs,
    guide: businessUse.guide ?? defaultBusinessUseGuide(businessUse.slug)
  });
  const [status, setStatus] = useState<{ tone: "success" | "error"; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const selectedProductSlugs = useMemo(() => new Set(form.productSlugs), [form.productSlugs]);
  const availableProducts = useMemo(() => products.filter((product) => !selectedProductSlugs.has(product.slug)), [products, selectedProductSlugs]);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => {
      if (key === "title" && mode === "create" && !current.slug) {
        return { ...current, title: value as string, slug: slugify(value as string) };
      }
      return { ...current, [key]: value };
    });
    setStatus(null);
  }

  function addProduct(slug: string) {
    if (!slug || selectedProductSlugs.has(slug)) {
      return;
    }

    setForm((current) => ({
      ...current,
      productSlugs: [...current.productSlugs, slug]
    }));
    setStatus(null);
  }

  function removeProduct(slug: string) {
    setForm((current) => ({
      ...current,
      productSlugs: current.productSlugs.filter((item) => item !== slug)
    }));
    setStatus(null);
  }

  function updateGuide(guide: BusinessUseGuide) { update("guide", guide); }
  function moveProduct(index: number, direction: number) {
    const slugs = [...form.productSlugs];
    const target = index + direction;
    if (target < 0 || target >= slugs.length) return;
    [slugs[index], slugs[target]] = [slugs[target], slugs[index]];
    update("productSlugs", slugs);
  }

  async function save() {
    const guideCheck = businessUseGuideSchema.safeParse(form.guide);
    if (!guideCheck.success) {
      setStatus({ tone: "error", message: `Check your buying guide: ${guideCheck.error.issues[0].message} (${guideCheck.error.issues[0].path.join(" → ")}). Fill all fields or remove unfinished entries.` });
      return;
    }
    setIsSaving(true);
    setStatus(null);

    try {
      const response = await fetch("/api/admin/business-uses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          originalSlug: form.originalSlug || undefined,
          seoTitle: form.seoTitle || undefined,
          seoDescription: form.seoDescription || undefined,
          imageUrl: form.imageUrl || undefined,
          bannerImageUrl: form.bannerImageUrl || undefined
        })
      });
      const payload = await response.json().catch(() => null) as { slug?: string; error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error ?? "Business use could not be saved.");
      }
      setStatus({ tone: "success", message: "Business use saved." });
      router.push(`/admin/business-uses/${payload?.slug ?? form.slug}`);
      router.refresh();
    } catch (error) {
      setStatus({ tone: "error", message: error instanceof Error ? error.message : "Business use could not be saved." });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-5">
        <Panel title="Content">
          <TextInput label="Title" value={form.title} onChange={(value) => update("title", value)} />
          <TextInput label="Slug" value={form.slug} disabled={mode === "edit"} onChange={(value) => update("slug", slugify(value))} />
          {mode === "edit" ? <p className="text-xs font-semibold text-muted">Slug changes are intentionally blocked after creation to protect product assignments and public URLs.</p> : null}
          <TextArea label="Short description" value={form.shortDescription} rows={3} onChange={(value) => update("shortDescription", value)} />
          <TextArea label="Card description" value={form.description} rows={3} onChange={(value) => update("description", value)} />
          <TextArea label="Long landing page content" value={form.longContent} rows={8} onChange={(value) => update("longContent", value)} />
        </Panel>

        <Panel title="Buying guide">
          <p className="text-sm text-muted">Featured recommendations appear first, in this order. Choose up to three public products and explain why each fits this business. Blank headline and introduction use the existing page content.</p>
          <TextInput label="Buying guide headline" value={form.guide.headline} onChange={(headline) => updateGuide({ ...form.guide, headline })} />
          <TextArea label="Buying guide introduction" rows={3} value={form.guide.introduction} onChange={(introduction) => updateGuide({ ...form.guide, introduction })} />
          <p className="text-sm text-muted">Use one descriptive H1, a short introduction, and useful industry-specific copy. Aim for roughly 700–900 words on a complete guide, without padding. The storefront supplies the design comparison and product links.</p>
          <TextInput label="Recommendations heading (H2)" value={form.guide.recommendationsTitle ?? ""} onChange={(recommendationsTitle) => updateGuide({ ...form.guide, recommendationsTitle })} />
          {form.guide.recommendations.map((item, index) => <fieldset key={index} className="space-y-3 rounded-lg border border-line p-4">
            <legend className="px-2 font-semibold">Recommendation {index + 1}</legend>
            <label className="block text-sm font-semibold">Product<select className="mt-2 w-full rounded border border-line p-2" value={item.productSlug} onChange={(event) => updateGuide({ ...form.guide, recommendations: form.guide.recommendations.map((current, i) => i === index ? { ...current, productSlug: event.target.value } : current) })}><option value="">Choose a product</option>{products.map((product) => <option key={product.slug} value={product.slug}>{product.title}</option>)}</select></label>
            {(["goal", "reason", "placement"] as const).map((field) => <TextArea key={field} label={{ goal: "Customer action", reason: "Why this stand fits", placement: "Where to place it" }[field]} rows={2} value={item[field]} onChange={(value) => updateGuide({ ...form.guide, recommendations: form.guide.recommendations.map((current, i) => i === index ? { ...current, [field]: value } : current) })} />)}
            <div className="flex flex-wrap gap-4"><button type="button" className="text-sm underline disabled:opacity-40" disabled={index === 0} onClick={() => { const recommendations = [...form.guide.recommendations]; [recommendations[index - 1], recommendations[index]] = [recommendations[index], recommendations[index - 1]]; updateGuide({ ...form.guide, recommendations }); }}>Move up</button><button type="button" className="text-sm text-red-700 underline" onClick={() => updateGuide({ ...form.guide, recommendations: form.guide.recommendations.filter((_, i) => i !== index) })}>Remove recommendation</button></div>
          </fieldset>)}
          <button type="button" className="text-sm font-semibold underline disabled:opacity-40" disabled={form.guide.recommendations.length >= 3} onClick={() => updateGuide({ ...form.guide, recommendations: [...form.guide.recommendations, { productSlug: "", goal: "", reason: "", placement: "" }] })}>Add recommendation</button>
        </Panel>
        <Panel title="Placement guide">
          <TextInput label="Placement heading (H2)" value={form.guide.placementTitle ?? ""} onChange={(placementTitle) => updateGuide({ ...form.guide, placementTitle })} />
          <GuideSectionEditor items={form.guide.placements ?? []} limit={6} label="Placement" products={products} onChange={(placements) => updateGuide({ ...form.guide, placements })} />
        </Panel>
        <Panel title="How it works">
          <TextInput label="How it works heading (H2)" value={form.guide.howItWorksTitle ?? ""} onChange={(howItWorksTitle) => updateGuide({ ...form.guide, howItWorksTitle })} />
          <GuideSectionEditor items={form.guide.steps ?? []} limit={5} label="Step" onChange={(steps) => updateGuide({ ...form.guide, steps })} />
        </Panel>
        <Panel title="Business FAQs">
          <TextInput label="FAQ heading (H2)" value={form.guide.faqTitle ?? ""} onChange={(faqTitle) => updateGuide({ ...form.guide, faqTitle })} />
          {form.guide.faqs.map((faq, index) => <fieldset key={index} className="space-y-3 rounded-lg border border-line p-4"><legend className="px-2 font-semibold">FAQ {index + 1}</legend><TextInput label="Question" value={faq.question} onChange={(question) => updateGuide({ ...form.guide, faqs: form.guide.faqs.map((item, i) => i === index ? { ...item, question } : item) })} /><TextArea label="Answer" rows={3} value={faq.answer} onChange={(answer) => updateGuide({ ...form.guide, faqs: form.guide.faqs.map((item, i) => i === index ? { ...item, answer } : item) })} /><button type="button" className="text-sm text-red-700 underline" onClick={() => updateGuide({ ...form.guide, faqs: form.guide.faqs.filter((_, i) => i !== index) })}>Remove FAQ</button></fieldset>)}
          <button type="button" className="text-sm font-semibold underline disabled:opacity-40" disabled={form.guide.faqs.length >= 8} onClick={() => updateGuide({ ...form.guide, faqs: [...form.guide.faqs, { question: "", answer: "" }] })}>Add FAQ</button>
        </Panel>
        <Panel title="Additional products">
          <p className="text-sm text-muted">Shown after the featured recommendations, in the order below. Products also assigned from their product editor follow this list.</p>
          <ProductSelect products={availableProducts} onAdd={addProduct} />
          <div className="grid gap-2">
            {form.productSlugs.map((slug, index) => {
              const product = products.find((item) => item.slug === slug);

              return (
                <div key={slug} className="flex items-center justify-between gap-3 rounded-md border border-line bg-white px-3 py-2 text-sm">
                  <span>
                    <span className="font-bold text-ink">{product?.title ?? slug}</span>
                    <span className="ml-2 text-xs text-muted">{slug}</span>
                  </span>
                  <div className="flex flex-wrap gap-2"><button type="button" aria-label={`Move ${product?.title ?? slug} up`} disabled={index === 0} className="text-xs underline disabled:opacity-40" onClick={() => moveProduct(index, -1)}>Up</button><button type="button" aria-label={`Move ${product?.title ?? slug} down`} disabled={index === form.productSlugs.length - 1} className="text-xs underline disabled:opacity-40" onClick={() => moveProduct(index, 1)}>Down</button><button type="button" className="rounded-md border border-line px-3 py-1.5 text-xs font-bold text-ink hover:border-red-300 hover:text-red-700" onClick={() => removeProduct(slug)}>
                    Remove
                  </button></div>
                </div>
              );
            })}
            {form.productSlugs.length === 0 ? <p className="rounded-md border border-dashed border-line bg-soft p-4 text-sm font-semibold text-muted">No products selected.</p> : null}
          </div>
        </Panel>
      </div>

      <div className="space-y-5">
        <Panel title="Publishing">
          <label className="flex items-center justify-between rounded-md border border-line px-3 py-3 text-sm font-bold text-ink">
            Active publicly
            <input type="checkbox" className="h-4 w-4 accent-brand" checked={form.isActive} onChange={(event) => update("isActive", event.target.checked)} />
          </label>
          <NumberInput label="Display order" value={form.sortOrder} onChange={(value) => update("sortOrder", value)} />
        </Panel>

        <Panel title="Media and SEO">
          <TextInput label="Image URL" value={form.imageUrl} onChange={(value) => update("imageUrl", value)} />
          <TextInput label="Banner image URL" value={form.bannerImageUrl} onChange={(value) => update("bannerImageUrl", value)} />
          <TextInput label="SEO title" value={form.seoTitle} onChange={(value) => update("seoTitle", value)} />
          <TextArea label="SEO description" value={form.seoDescription} rows={4} onChange={(value) => update("seoDescription", value)} />
        </Panel>

        <button
          type="button"
          className="w-full rounded-md bg-ink px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSaving}
          onClick={save}
        >
          {isSaving ? "Saving..." : "Save business use"}
        </button>
        {status ? <p className={status.tone === "success" ? "text-sm font-bold text-brand" : "text-sm font-bold text-red-700"}>{status.message}</p> : null}
      </div>
    </div>
  );
}

function GuideSectionEditor({ items, limit, label, products, onChange }: {
  items: Array<{ title: string; body: string; productSlug?: string }>; limit: number; label: string;
  products?: MigratedProduct[];
  onChange: (items: Array<{ title: string; body: string; productSlug?: string }>) => void;
}) {
  return <div className="space-y-4">
    {items.map((item, index) => <fieldset key={index} className="space-y-3 rounded-lg border border-line p-4">
      <legend className="px-2 font-semibold">{label} {index + 1}</legend>
      <TextInput label="Title (H3)" value={item.title} onChange={(title) => onChange(items.map((current, i) => i === index ? { ...current, title } : current))} />
      <TextArea label="Description" rows={4} value={item.body} onChange={(body) => onChange(items.map((current, i) => i === index ? { ...current, body } : current))} />
      {products ? <label className="block text-xs font-black uppercase text-muted">Related product
        <select className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2 text-sm font-normal text-ink" value={item.productSlug ?? ""} onChange={(event) => onChange(items.map((current, i) => i === index ? { ...current, productSlug: event.target.value || undefined } : current))}>
          <option value="">No product link</option>
          {products.map((product) => <option key={product.slug} value={product.slug}>{product.title}</option>)}
        </select>
      </label> : null}
      <div className="flex gap-4"><button type="button" className="text-sm underline disabled:opacity-40" disabled={index === 0} onClick={() => { const next = [...items]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; onChange(next); }}>Move up</button><button type="button" className="text-sm text-red-700 underline" onClick={() => onChange(items.filter((_, i) => i !== index))}>Remove {label.toLowerCase()}</button></div>
    </fieldset>)}
    <button type="button" className="text-sm font-semibold underline disabled:opacity-40" disabled={items.length >= limit} onClick={() => onChange([...items, { title: "", body: "" }])}>Add {label.toLowerCase()}</button>
  </div>;
}

function ProductSelect({ onAdd, products }: { products: MigratedProduct[]; onAdd: (slug: string) => void }) {
  const [selectedSlug, setSelectedSlug] = useState("");

  return (
    <div className="grid gap-3 rounded-md border border-line bg-soft p-4 sm:grid-cols-[1fr_auto]">
      <label className="block text-xs font-black uppercase text-muted">
        Add product
        <select className="mt-2 w-full rounded-md border border-line bg-white px-3 py-2 text-sm font-normal text-ink" value={selectedSlug} onChange={(event) => setSelectedSlug(event.target.value)}>
          <option value="">Select a product</option>
          {products.map((product) => (
            <option key={product.slug} value={product.slug}>
              {product.title}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="self-end rounded-md bg-ink px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!selectedSlug}
        onClick={() => {
          onAdd(selectedSlug);
          setSelectedSlug("");
        }}
      >
        Add
      </button>
    </div>
  );
}

function Panel({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <section className="rounded-md border border-line bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black text-ink">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function TextInput({ disabled = false, label, onChange, value }: { disabled?: boolean; label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-xs font-black uppercase text-muted">
      {label}
      <input className="mt-2 w-full rounded-md border border-line px-3 py-2 text-sm font-normal text-ink disabled:bg-gray-100" disabled={disabled} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function NumberInput({ label, onChange, value }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="block text-xs font-black uppercase text-muted">
      {label}
      <input className="mt-2 w-full rounded-md border border-line px-3 py-2 text-sm font-normal text-ink" type="number" min={0} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function TextArea({ label, onChange, rows, value }: { label: string; value: string; rows: number; onChange: (value: string) => void }) {
  return (
    <label className="block text-xs font-black uppercase text-muted">
      {label}
      <textarea className="mt-2 w-full rounded-md border border-line px-3 py-2 text-sm font-normal leading-6 text-ink" rows={rows} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
