"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { MigratedProduct } from "@/data/migrated-products";
import type { AdminBusinessUse } from "@/lib/admin-business-uses";

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
    seoTitle: businessUse.seoTitle ?? "",
    seoDescription: businessUse.seoDescription ?? "",
    imageUrl: businessUse.imageUrl ?? "",
    bannerImageUrl: businessUse.bannerImageUrl ?? "",
    sortOrder: businessUse.sortOrder,
    isActive: businessUse.isActive,
    productSlugs: businessUse.productSlugs
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

  async function save() {
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

        <Panel title="Assigned products">
          <ProductSelect products={availableProducts} onAdd={addProduct} />
          <div className="grid gap-2">
            {form.productSlugs.map((slug) => {
              const product = products.find((item) => item.slug === slug);

              return (
                <div key={slug} className="flex items-center justify-between gap-3 rounded-md border border-line bg-white px-3 py-2 text-sm">
                  <span>
                    <span className="font-bold text-ink">{product?.title ?? slug}</span>
                    <span className="ml-2 text-xs text-muted">{slug}</span>
                  </span>
                  <button type="button" className="rounded-md border border-line px-3 py-1.5 text-xs font-bold text-ink hover:border-red-300 hover:text-red-700" onClick={() => removeProduct(slug)}>
                    Remove
                  </button>
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
