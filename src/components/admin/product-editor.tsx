"use client";

import { type ChangeEvent, type FormEvent, useMemo, useState } from "react";
import type { CatalogCategory, MigratedProduct, ProductCustomizationOption, ProductProviderOption } from "@/data/migrated-products";
import { useCases } from "@/data/use-cases";
import { collectProviderOptions, collectTemplateImages, maxEditableProviderOptions } from "@/lib/admin-product-form-helpers";

const supportedDestinationOptions = [
  "google",
  "facebook",
  "yelp",
  "tripadvisor",
  "instagram",
  "tiktok",
  "booking",
  "website",
  "menu",
  "wifi",
  "feedback",
  "referral",
  "custom"
] as const;

const customizationOptionLabels: { value: ProductCustomizationOption; label: string }[] = [
  { value: "standard_design", label: "Standard" },
  { value: "add_logo", label: "Logo" },
  { value: "custom_design", label: "Custom" }
];

const maxEditableImages = 4;
const maxEditableVariants = 4;

type ProductEditorProps = {
  product: MigratedProduct;
  categories: CatalogCategory[];
  mode: "create" | "edit";
};

type SaveStatus = {
  tone: "success" | "error";
  message: string;
} | null;

export function ProductEditor({ product, categories, mode }: ProductEditorProps) {
  const [status, setStatus] = useState<SaveStatus>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState(product.title);
  const slug = useMemo(() => (mode === "create" || !product.slug ? slugifyTitle(title) : product.slug), [mode, product.slug, title]);
  const sku = useMemo(() => (mode === "create" || !product.sku ? generateSku(title) : product.sku), [mode, product.sku, title]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setStatus(null);

    const form = new FormData(event.currentTarget);
    const salePrice = String(form.get("salePriceCents") ?? "");
    const supportedDestinations = form.getAll("supportedDestinations").map(String);

    try {
      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: form.get("slug"),
          title: form.get("title"),
          sku: form.get("sku"),
          categorySlug: form.get("categorySlug"),
          basePriceCents: Number(form.get("basePriceCents")),
          salePriceCents: salePrice ? Number(salePrice) : undefined,
          stockStatus: form.get("stockStatus"),
          shortDescription: form.get("shortDescription"),
          description: form.get("description"),
          productType: form.get("productType"),
          serviceMode: form.get("serviceMode"),
          checkoutMode: form.get("checkoutMode"),
          requiresAccount: form.get("requiresAccount") === "true",
          requiresSubscription: form.get("requiresSubscription") === "true",
          requiresLandingPage: form.get("requiresLandingPage") === "true",
          supportedDestinations: supportedDestinations.length > 0 ? supportedDestinations : ["custom"],
          activationType: form.get("activationType"),
          includedServiceLabel: form.get("includedServiceLabel"),
          customizationOptions: form.getAll("customizationOptions"),
          allowsLogoUpload: form.get("allowsLogoUpload") === "true",
          allowsCustomDesign: form.get("allowsCustomDesign") === "true",
          designMode: form.get("designMode"),
          featured: form.get("featured") === "true",
          images: collectImages(form),
          variants: collectVariants(form),
          seoTitle: form.get("seoTitle"),
          seoDescription: form.get("seoDescription"),
          isActive: form.get("isActive") === "true",
          designLogic: form.get("designLogic"),
          pricingTier: form.get("pricingTier"),
          useCaseSlugs: form.getAll("useCaseSlugs"),
          platformSlug: String(form.get("platformSlug") ?? "").trim() || undefined,
          colorOptions: String(form.get("colorOptions") ?? "")
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
          templateImages: collectTemplateImages(form),
          providerOptions: collectProviderOptions(form)
        })
      });
      const body = await response.json().catch(() => ({}));
      setStatus({
        tone: response.ok ? "success" : "error",
        message: response.ok ? (mode === "create" ? "Product created." : "Product saved.") : body.error ?? "Product save failed."
      });
    } catch {
      setStatus({ tone: "error", message: "Product save failed." });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="mx-auto grid max-w-6xl gap-3" onSubmit={submit}>
      <section className="grid gap-3 rounded-xl border border-line bg-white p-3 shadow-sm">
        <SectionIntro title="Product identity" description="Title is editable. Slug and SKU are generated and locked for stable storefront URLs." />
        <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr_0.8fr_0.9fr]">
          <Input name="title" label="Title" value={title} onChange={setTitle} placeholder="Google Review Stand" />
          <Input name="slug" label="Slug" defaultValue={slug} readOnly />
          <Input name="sku" label="SKU" defaultValue={sku} readOnly />
          <label className="grid gap-1 text-xs font-bold text-ink">
            Use / category
            <select className="rounded-md border border-line bg-white px-3 py-2 font-normal" name="categorySlug" defaultValue={product.categorySlug}>
              {categories.map((category) => (
                <option key={category.slug} value={category.slug}>
                  {category.title}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <Select name="stockStatus" label="Stock" defaultValue={product.stockStatus} options={[["instock", "In stock"], ["outofstock", "Out of stock"]]} />
          <Select name="isActive" label="Visibility" defaultValue={product.isActive ? "true" : "false"} options={[["true", "Active"], ["false", "Draft"]]} />
          <Select name="featured" label="Featured" defaultValue={product.featured ? "true" : "false"} options={[["false", "No"], ["true", "Yes"]]} />
          <Input name="basePriceCents" label="Base price cents" defaultValue={String(product.basePriceCents)} inputMode="numeric" placeholder="4900" />
        </div>
      </section>

      <section className="grid gap-3 rounded-xl border border-line bg-white p-3 shadow-sm">
        <SectionIntro title="Product copy" description="Short card text and product-page description." />
        <div className="grid gap-3 lg:grid-cols-2">
          <Textarea name="shortDescription" label="Short description" defaultValue={product.shortDescription} />
          <Textarea name="description" label="Full description" defaultValue={product.description} />
        </div>
        <Input
          name="salePriceCents"
          label="Sale price cents"
          defaultValue={product.salePriceCents === undefined ? "" : String(product.salePriceCents)}
          inputMode="numeric"
          placeholder="Optional"
          required={false}
        />
      </section>

      <ProductImagesEditor images={product.images} />
      <ProductVariantsEditor variants={product.variants} />

      <section className="grid gap-3 rounded-xl border border-line bg-white p-3 shadow-sm">
        <SectionIntro title="Product logic" description="Controls checkout behavior and what the customer can configure." />
        <div className="grid gap-3 md:grid-cols-3">
          <Select
            name="productType"
            label="Product type"
            defaultValue={product.productType}
            options={[
              ["physical_redirect", "Physical direct"],
              ["physical_managed", "Managed physical"],
              ["platform_landing_page", "Hosted page"],
              ["bundle", "Bundle"]
            ]}
          />
          <Select
            name="serviceMode"
            label="Service mode"
            defaultValue={product.serviceMode}
            options={[
              ["basic_redirect", "Basic redirect"],
              ["managed_redirect", "Managed redirect"],
              ["hosted_landing_page", "Hosted page"],
              ["multi_location_platform", "Multi-location"]
            ]}
          />
          <Select
            name="checkoutMode"
            label="Checkout"
            defaultValue={product.checkoutMode}
            options={[
              ["buy_now", "Buy now"],
              ["request_quote", "Request quote"],
              ["subscription", "Subscription"],
              ["contact_sales", "Contact sales"]
            ]}
          />
          <Select name="requiresAccount" label="Account" defaultValue={product.requiresAccount ? "true" : "false"} options={[["false", "Not required"], ["true", "Required"]]} />
          <Select name="requiresSubscription" label="Subscription" defaultValue={product.requiresSubscription ? "true" : "false"} options={[["false", "No"], ["true", "Required"]]} />
          <Select name="requiresLandingPage" label="Landing page" defaultValue={product.requiresLandingPage ? "true" : "false"} options={[["false", "Direct link"], ["true", "Hosted page"]]} />
          <Select
            name="activationType"
            label="Activation"
            defaultValue={product.activationType}
            options={[
              ["free_basic_activation", "Free basic"],
              ["managed_setup", "Managed setup"],
              ["premium_hosted_activation", "Premium hosted"]
            ]}
          />
          <Select name="allowsLogoUpload" label="Logo" defaultValue={product.allowsLogoUpload ? "true" : "false"} options={[["true", "Available"], ["false", "No logo"]]} />
          <Select name="allowsCustomDesign" label="Custom design" defaultValue={product.allowsCustomDesign ? "true" : "false"} options={[["true", "Available"], ["false", "Not available"]]} />
          <Select name="designMode" label="Design mode" defaultValue={product.designMode} options={[["standard", "Standard"], ["logo", "Logo"], ["custom", "Custom"]]} />
          <Input name="includedServiceLabel" label="Service label" defaultValue={product.includedServiceLabel} placeholder="Free basic activation" />
        </div>
        <fieldset className="grid gap-2">
          <legend className="text-xs font-bold text-ink">Customer destination types</legend>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {supportedDestinationOptions.map((destination) => (
              <label key={destination} className="flex items-center gap-2 rounded-md border border-line bg-gray-50 px-3 py-2 text-xs font-semibold text-ink">
                <input
                  type="checkbox"
                  name="supportedDestinations"
                  value={destination}
                  defaultChecked={product.supportedDestinations.includes(destination)}
                />
                {destination}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset className="grid gap-2">
          <legend className="text-xs font-bold text-ink">Customization choices</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {customizationOptionLabels.map((option) => (
              <label key={option.value} className="flex items-center gap-2 rounded-md border border-line bg-gray-50 px-3 py-2 text-xs font-semibold text-ink">
                <input type="checkbox" name="customizationOptions" value={option.value} defaultChecked={product.customizationOptions.includes(option.value)} />
                {option.label}
              </label>
            ))}
          </div>
        </fieldset>
      </section>

      <section className="grid gap-3 rounded-xl border border-line bg-white p-3 shadow-sm">
        <SectionIntro
          title="Design logic"
          description="Which printed-design template rules govern this stand, its pricing tier, which business types it's recommended for, and (for branded platform products) which real-world platform it represents."
        />
        <div className="grid gap-3 md:grid-cols-3">
          <Select
            name="designLogic"
            label="Design logic"
            defaultValue={product.designLogic}
            options={[
              ["standard_platform_locked", "Standard, platform locked"],
              ["branded_platform_template", "Branded platform template"],
              ["text_action_locked", "Text/action, locked"],
              ["text_action_branded", "Text/action, branded"],
              ["fully_custom_design", "Fully custom design"]
            ]}
          />
          <Select
            name="pricingTier"
            label="Pricing tier"
            defaultValue={product.pricingTier}
            options={[
              ["standard_direct", "Standard Direct ($39)"],
              ["branded_qr_direct", "Branded + QR Direct ($49)"],
              ["hosted_multi_link", "Hosted Multi-Link ($49 + $9.90/mo)"],
              ["custom", "Custom"]
            ]}
          />
          <Input name="platformSlug" label="Platform (optional)" defaultValue={product.platformSlug ?? ""} required={false} placeholder="google, yelp, cars-com..." />
        </div>
        <Input
          name="colorOptions"
          label="Color options (comma-separated, optional)"
          defaultValue={(product.colorOptions ?? []).join(", ")}
          required={false}
          placeholder="White, Black"
        />
        <fieldset className="grid gap-2">
          <legend className="text-xs font-bold text-ink">Use cases (Shop by Use)</legend>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {useCases.map((useCase) => (
              <label key={useCase.slug} className="flex items-center gap-2 rounded-md border border-line bg-gray-50 px-3 py-2 text-xs font-semibold text-ink">
                <input type="checkbox" name="useCaseSlugs" value={useCase.slug} defaultChecked={product.useCaseSlugs.includes(useCase.slug)} />
                {useCase.name}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="grid gap-2">
          <p className="text-xs font-bold text-ink">Template images (optional -- for branded/platform products)</p>
          <div className="grid gap-2 md:grid-cols-3">
            <TemplateImageRow prefix="templateStandard" label="Standard variant" image={product.templateImages?.standard} />
            <TemplateImageRow prefix="templateBranded" label="Branded variant" image={product.templateImages?.branded} />
            <TemplateImageRow prefix="templateBrandedWithQr" label="Branded + QR variant" image={product.templateImages?.brandedWithQr} />
          </div>
        </div>
      </section>

      <ProductProviderOptionsEditor providerOptions={product.providerOptions ?? []} />

      <section className="grid gap-3 rounded-xl border border-line bg-white p-3 shadow-sm">
        <SectionIntro title="SEO" description="Optional public metadata." />
        <div className="grid gap-3 lg:grid-cols-2">
          <Input name="seoTitle" label="SEO title" defaultValue={product.seoTitle ?? ""} required={false} placeholder="Google Review Stand for Businesses" />
          <Textarea name="seoDescription" label="SEO description" defaultValue={product.seoDescription ?? ""} required={false} />
        </div>
      </section>

      <div className="sticky bottom-3 z-10 flex flex-col gap-3 rounded-xl border border-line bg-white/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <button className="rounded-md bg-brand px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-300" disabled={isSaving}>
          {isSaving ? "Saving..." : mode === "create" ? "Create product" : "Save product"}
        </button>
        {status ? <p className={status.tone === "success" ? "text-sm font-bold text-brand" : "text-sm font-bold text-red-600"}>{status.message}</p> : null}
      </div>
    </form>
  );
}

function ProductImagesEditor({ images }: { images: MigratedProduct["images"] }) {
  const rows = Array.from({ length: maxEditableImages }, (_, index) => images[index] ?? { src: "", alt: "" });

  return (
    <section className="grid gap-3 rounded-xl border border-line bg-white p-3 shadow-sm">
      <SectionIntro title="Product images" description="The first image is the product thumbnail and main storefront image." />
      <div className="grid gap-2">
        {rows.map((image, index) => (
          <ImageRow key={index} srcName={`imageSrc${index}`} altName={`imageAlt${index}`} image={image} label={index === 0 ? "Main thumbnail" : `Image ${index + 1}`} />
        ))}
      </div>
    </section>
  );
}

function ProductVariantsEditor({ variants }: { variants: MigratedProduct["variants"] }) {
  const rows = Array.from({ length: maxEditableVariants }, (_, index) => variants[index] ?? { id: "", label: "", sku: "", stockStatus: "instock" as const, imageSrc: "" });

  return (
    <section className="grid gap-3 rounded-xl border border-line bg-white p-3 shadow-sm">
      <SectionIntro title="Color variations" description="Use one row per stand color or variant. The variant image is optional." />
      <div className="grid gap-2">
        {rows.map((variant, index) => (
          <div key={index} className="grid gap-2 rounded-md border border-line bg-gray-50 p-2 lg:grid-cols-[0.7fr_1fr_1fr_0.8fr_1.2fr]">
            <Input name={`variantId${index}`} label="Color ID" defaultValue={variant.id} required={false} placeholder="white" />
            <Input name={`variantLabel${index}`} label="Color name" defaultValue={variant.label} required={false} placeholder="White" />
            <Input name={`variantSku${index}`} label="Variant SKU" defaultValue={variant.sku} required={false} placeholder="TR-GOOGLE-WHITE" />
            <Select name={`variantStockStatus${index}`} label="Stock" defaultValue={variant.stockStatus} options={[["instock", "In stock"], ["outofstock", "Out of stock"]]} />
            <ImageRow srcName={`variantImageSrc${index}`} image={{ src: variant.imageSrc ?? "", alt: "" }} label="Variant image" compact />
          </div>
        ))}
      </div>
    </section>
  );
}

function ImageRow({
  srcName,
  altName,
  image,
  label,
  compact = false
}: {
  srcName: string;
  altName?: string;
  image: { src: string; alt: string };
  label: string;
  compact?: boolean;
}) {
  const [src, setSrc] = useState(image.src);

  return (
    <div className={`grid gap-2 rounded-md border border-line bg-gray-50 p-2 ${compact ? "" : "md:grid-cols-[84px_1fr_1fr]"}`}>
      <div className="flex h-16 w-20 items-center justify-center overflow-hidden rounded-md border border-line bg-white">
        {src ? <img src={src} alt="" className="h-full w-full object-contain" /> : <span className="text-[10px] font-bold uppercase text-muted">No image</span>}
      </div>
      <Input name={srcName} label={label} defaultValue={image.src} required={false} placeholder="/uploads/products/example.jpg" onChange={setSrc} />
      {altName ? <Input name={altName} label="Alt text" defaultValue={image.alt} required={false} placeholder="White stand product photo" /> : null}
    </div>
  );
}

function TemplateImageRow({ prefix, label, image }: { prefix: string; label: string; image?: { src: string; alt: string } }) {
  const [src, setSrc] = useState(image?.src ?? "");

  return (
    <div className="grid gap-2 rounded-md border border-line bg-gray-50 p-2">
      <div className="flex h-16 w-full items-center justify-center overflow-hidden rounded-md border border-line bg-white">
        {src ? <img src={src} alt="" className="h-full w-full object-contain" /> : <span className="text-[10px] font-bold uppercase text-muted">No image</span>}
      </div>
      <Input name={`${prefix}Src`} label={label} defaultValue={image?.src ?? ""} required={false} placeholder="/uploads/templates/example.png" onChange={setSrc} />
      <Input name={`${prefix}Alt`} label="Alt text" defaultValue={image?.alt ?? ""} required={false} placeholder="Google branded template preview" />
    </div>
  );
}

function ProductProviderOptionsEditor({ providerOptions }: { providerOptions: ProductProviderOption[] }) {
  const rows = Array.from({ length: maxEditableProviderOptions }, (_, index) => providerOptions[index] ?? { slug: "", label: "", destinationUrlHint: "" });

  return (
    <section className="grid gap-3 rounded-xl border border-line bg-white p-3 shadow-sm">
      <SectionIntro
        title="Provider options"
        description="For generic actions backed by many possible third-party providers (Book Your Next Visit's Vagaro/Calendly/etc., Rate Your Experience's Google Forms/Typeform/etc.). These are NOT separate products -- leave blank if this product doesn't need provider options."
      />
      <div className="grid gap-2">
        {rows.map((option, index) => (
          <div key={index} className="grid gap-2 rounded-md border border-line bg-gray-50 p-2 md:grid-cols-3">
            <Input name={`providerSlug${index}`} label="Slug" defaultValue={option.slug} required={false} placeholder="vagaro" />
            <Input name={`providerLabel${index}`} label="Label" defaultValue={option.label} required={false} placeholder="Vagaro" />
            <Input
              name={`providerHint${index}`}
              label="Destination URL hint (optional)"
              defaultValue={option.destinationUrlHint ?? ""}
              required={false}
              placeholder="https://www.vagaro.com/your-business"
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function SectionIntro({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-base font-black text-ink">{title}</h2>
      <p className="mt-1 text-xs leading-5 text-muted">{description}</p>
    </div>
  );
}

function Input({
  name,
  label,
  value,
  defaultValue,
  inputMode,
  placeholder,
  required = true,
  readOnly = false,
  onChange
}: {
  name: string;
  label: string;
  value?: string;
  defaultValue?: string;
  inputMode?: "numeric";
  placeholder?: string;
  required?: boolean;
  readOnly?: boolean;
  onChange?: (value: string) => void;
}) {
  const controlledProps =
    value === undefined
      ? { defaultValue, onChange: onChange ? (event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value) : undefined }
      : { value, onChange: (event: ChangeEvent<HTMLInputElement>) => onChange?.(event.target.value) };

  return (
    <label className="grid gap-1 text-xs font-bold text-ink">
      {label}
      <input
        className="rounded-md border border-line bg-white px-3 py-2 font-normal text-ink read-only:bg-gray-100"
        name={name}
        inputMode={inputMode}
        placeholder={placeholder}
        required={required}
        readOnly={readOnly}
        {...controlledProps}
      />
    </label>
  );
}

function Select({ name, label, defaultValue, options }: { name: string; label: string; defaultValue: string; options: [string, string][] }) {
  return (
    <label className="grid gap-1 text-xs font-bold text-ink">
      {label}
      <select className="rounded-md border border-line bg-white px-3 py-2 font-normal" name={name} defaultValue={defaultValue}>
        {options.map(([value, labelText]) => (
          <option key={value} value={value}>
            {labelText}
          </option>
        ))}
      </select>
    </label>
  );
}

function Textarea({ name, label, defaultValue, required = true }: { name: string; label: string; defaultValue: string; required?: boolean }) {
  return (
    <label className="grid gap-1 text-xs font-bold text-ink">
      {label}
      <textarea className="min-h-24 rounded-md border border-line bg-white px-3 py-2 font-normal text-ink" name={name} defaultValue={defaultValue} required={required} />
    </label>
  );
}

function collectImages(form: FormData): MigratedProduct["images"] {
  return Array.from({ length: maxEditableImages }, (_, index) => {
    const src = String(form.get(`imageSrc${index}`) ?? "").trim();
    const alt = String(form.get(`imageAlt${index}`) ?? "").trim();
    return src ? { src, alt } : null;
  }).filter((image): image is MigratedProduct["images"][number] => Boolean(image));
}

function collectVariants(form: FormData): MigratedProduct["variants"] {
  return Array.from({ length: maxEditableVariants }, (_, index) => {
    const id = String(form.get(`variantId${index}`) ?? "").trim();
    const label = String(form.get(`variantLabel${index}`) ?? "").trim();
    const sku = String(form.get(`variantSku${index}`) ?? "").trim();
    const stockStatus = String(form.get(`variantStockStatus${index}`) ?? "instock");
    const imageSrc = String(form.get(`variantImageSrc${index}`) ?? "").trim();

    if (!id || !label || !sku || (stockStatus !== "instock" && stockStatus !== "outofstock")) {
      return null;
    }

    return { id, label, sku, stockStatus, ...(imageSrc ? { imageSrc } : {}) };
  }).filter((variant): variant is MigratedProduct["variants"][number] => Boolean(variant));
}

function slugifyTitle(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

function generateSku(value: string) {
  const base = slugifyTitle(value)
    .split("-")
    .filter(Boolean)
    .slice(0, 4)
    .map((part) => part.slice(0, 4).toUpperCase())
    .join("-");

  return base ? `TR-${base}` : "";
}
