"use client";

import { type FormEvent, type ReactNode, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Image as ImageIcon, Save, XCircle } from "lucide-react";
import type { MigratedProduct, ProductKind, SupportedDestination } from "@/data/migrated-products";
import type {
  BusinessUse,
  PlatformDestination,
  ProductOption,
  ProductOptionCode,
  StandType
} from "@/lib/catalog-architecture";
import { getDefaultOptionsForProductKind, getProductAssetReadiness, inferProductKind } from "@/lib/catalog-architecture";
import { formatPrice } from "@/lib/products";

type ProductEditorProps = {
  product: MigratedProduct;
  standTypes: StandType[];
  businessUses: BusinessUse[];
  platforms: PlatformDestination[];
  optionTemplates: ProductOption[];
  productOptions: ProductOption[];
  mode: "create" | "edit";
};

type SaveStatus = {
  tone: "success" | "error";
  message: string;
} | null;

type AssetKey =
  | "standardAngledImageUrl"
  | "brandedAngledImageUrl"
  | "multiLinkAngledImageUrl"
  | "standardFrontTemplateUrl"
  | "brandedFrontTemplateUrl"
  | "multiLinkFrontTemplateUrl"
  | "centerAssetUrl";

type AssetSetState = Record<AssetKey, string> & {
  landingPagePreviewReady: boolean;
};

const normalOptionCodes: ProductOptionCode[] = ["standard_direct", "branded_qr_direct"];
const hostedOptionCodes: ProductOptionCode[] = ["hosted_multilink"];

export function ProductEditor({
  product,
  standTypes,
  businessUses,
  platforms,
  optionTemplates,
  productOptions,
  mode
}: ProductEditorProps) {
  const initialKind = product.productKind ?? inferProductKind(product);
  const [status, setStatus] = useState<SaveStatus>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [productKind, setProductKind] = useState<ProductKind>(initialKind);
  const [standTypeSlug, setStandTypeSlug] = useState(product.standTypeSlug ?? standTypes[0]?.slug ?? "");
  const [primaryPlatformSlug, setPrimaryPlatformSlug] = useState(product.primaryPlatformSlug ?? "custom-url");
  const [destinationType, setDestinationType] = useState(product.destinationType ?? selectedPlatformDestinationType(platforms, primaryPlatformSlug));
  const [businessUseSlugs, setBusinessUseSlugs] = useState<string[]>(product.businessUseSlugs ?? []);
  const [isSpecialSolution, setIsSpecialSolution] = useState(product.isSpecialSolution ?? productKind === "hosted_multilink");
  const [publishStatus, setPublishStatus] = useState(product.status ?? (product.isActive ? "active" : "draft"));
  const [assetSet, setAssetSet] = useState<AssetSetState>(() => ({
    standardAngledImageUrl: product.assetSet?.standardAngledImageUrl ?? product.images[0]?.src ?? "",
    brandedAngledImageUrl: product.assetSet?.brandedAngledImageUrl ?? product.images[1]?.src ?? product.assetSet?.standardAngledImageUrl ?? "",
    multiLinkAngledImageUrl: product.assetSet?.multiLinkAngledImageUrl ?? product.assetSet?.brandedAngledImageUrl ?? "",
    standardFrontTemplateUrl: product.assetSet?.standardFrontTemplateUrl ?? "",
    brandedFrontTemplateUrl: product.assetSet?.brandedFrontTemplateUrl ?? "",
    multiLinkFrontTemplateUrl: product.assetSet?.multiLinkFrontTemplateUrl ?? product.assetSet?.brandedFrontTemplateUrl ?? "",
    centerAssetUrl: product.assetSet?.centerAssetUrl ?? "",
    landingPagePreviewReady: Boolean(product.assetSet?.landingPagePreviewConfig && Object.keys(product.assetSet.landingPagePreviewConfig).length > 0)
  }));
  const [optionStates, setOptionStates] = useState<ProductOption[]>(() =>
    buildInitialOptions(productKind, productOptions, optionTemplates)
  );
  const [ctaEditable, setCtaEditable] = useState(product.ctaEditable ?? true);

  const isHostedProduct = productKind === "hosted_multilink";
  const visibleOptions = useMemo(
    () => optionStates.filter((option) => (isHostedProduct ? hostedOptionCodes : normalOptionCodes).includes(option.optionCode)),
    [isHostedProduct, optionStates]
  );
  const activeVisibleOptions = visibleOptions.filter((option) => option.isActive);
  const readiness = getProductAssetReadiness(
    {
      productKind,
      isSpecialSolution,
      assetSet: {
        standardAngledImageUrl: readOptionalString(assetSet.standardAngledImageUrl),
        brandedAngledImageUrl: readOptionalString(assetSet.brandedAngledImageUrl),
        multiLinkAngledImageUrl: readOptionalString(assetSet.multiLinkAngledImageUrl),
        standardFrontTemplateUrl: readOptionalString(assetSet.standardFrontTemplateUrl),
        brandedFrontTemplateUrl: readOptionalString(assetSet.brandedFrontTemplateUrl),
        multiLinkFrontTemplateUrl: readOptionalString(assetSet.multiLinkFrontTemplateUrl),
        centerAssetUrl: readOptionalString(assetSet.centerAssetUrl),
        landingPagePreviewConfig: assetSet.landingPagePreviewReady ? { ready: true } : undefined
      }
    },
    activeVisibleOptions
  );
  const activationIssues = [
    ...readiness.missing,
    ...getOrganizationIssues({
      productKind,
      standTypeSlug,
      primaryPlatformSlug,
      destinationType,
      businessUseSlugs,
      isSpecialSolution
    })
  ];
  const canActivate = activationIssues.length === 0;
  const primaryPlatform = platforms.find((platform) => platform.slug === primaryPlatformSlug);
  const pricingSummary = formatOptionPricing(activeVisibleOptions);

  function updateAsset(key: AssetKey, value: string) {
    setAssetSet((current) => ({ ...current, [key]: value }));
  }

  function updateOption(optionCode: ProductOptionCode, patch: Partial<ProductOption>) {
    setOptionStates((current) => current.map((option) => (option.optionCode === optionCode ? { ...option, ...patch } : option)));
  }

  function updateProductKind(nextProductKind: ProductKind) {
    setProductKind(nextProductKind);
    if (nextProductKind === "hosted_multilink") {
      setIsSpecialSolution(true);
      setDestinationType("custom");
      setPrimaryPlatformSlug("custom-url");
    }
  }

  function toggleBusinessUse(slug: string) {
    setBusinessUseSlugs((current) => (current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug]));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setStatus(null);

    const form = new FormData(event.currentTarget);
    const title = readRequiredText(form.get("title"));
    const slug = slugify(readRequiredText(form.get("slug")) || title);
    const finalSku = readOptionalString(String(form.get("sku") ?? "")) ?? generateSku(slug);
    const finalStatus = publishStatus === "active" && canActivate ? "active" : publishStatus === "archived" ? "archived" : "draft";
    const finalIsActive = finalStatus === "active";
    const finalOptions = visibleOptions.map((option) => ({ ...option, priceCents: Math.max(0, Math.round(option.priceCents)) }));
    const finalActiveOptions = finalOptions.filter((option) => option.isActive);
    const basePriceCents = finalActiveOptions.length > 0 ? Math.min(...finalActiveOptions.map((option) => option.priceCents)) : 3900;
    const supportedDestinations = getSupportedDestinations(primaryPlatformSlug);
    const shortDescription = readOptionalString(String(form.get("shortDescription") ?? "")) ?? `${title} NFC stand.`;
    const description = readOptionalString(String(form.get("description") ?? "")) ?? shortDescription;
    const defaultCtaText = readOptionalString(String(form.get("defaultCtaText") ?? "")) ?? defaultCtaForProduct(productKind);

    try {
      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          title,
          sku: finalSku,
          categorySlug: categorySlugForStandType(standTypeSlug),
          standTypeSlug,
          primaryPlatformSlug,
          destinationType,
          businessUseSlugs,
          isSpecialSolution: isSpecialSolution || productKind === "hosted_multilink",
          productKind,
          status: finalStatus,
          basePriceCents,
          salePriceCents: undefined,
          stockStatus: form.get("stockStatus"),
          shortDescription,
          description,
          productType: productKind === "hosted_multilink" ? "platform_landing_page" : "physical_redirect",
          serviceMode: productKind === "hosted_multilink" ? "hosted_landing_page" : "basic_redirect",
          checkoutMode: productKind === "hosted_multilink" ? "subscription" : "buy_now",
          requiresAccount: productKind === "hosted_multilink",
          requiresSubscription: productKind === "hosted_multilink",
          requiresLandingPage: productKind === "hosted_multilink",
          supportedDestinations,
          activationType: productKind === "hosted_multilink" ? "premium_hosted_activation" : "free_basic_activation",
          includedServiceLabel: productKind === "hosted_multilink" ? "Hosted Tap Rater page" : "Free basic activation",
          format: "stand",
          customizationOptions: productKind === "hosted_multilink" ? ["standard_design", "add_logo"] : ["standard_design", "add_logo"],
          allowsLogoUpload: finalActiveOptions.some((option) => option.requiresLogo),
          allowsCustomDesign: false,
          designMode: finalActiveOptions.some((option) => option.requiresLogo) ? "logo" : "standard",
          assetSet: cleanAssetSet(assetSet),
          defaultCtaText,
          ctaEditable,
          assetReadinessStatus: readiness.status,
          productOptions: finalOptions,
          images: collectImagesFromAssets(assetSet, title),
          seoTitle: readOptionalString(String(form.get("seoTitle") ?? "")),
          seoDescription: readOptionalString(String(form.get("seoDescription") ?? "")),
          isActive: finalIsActive
        })
      });
      const body = await response.json().catch(() => ({}));
      setStatus({
        tone: response.ok ? "success" : "error",
        message: response.ok
          ? mode === "create"
            ? finalIsActive
              ? "Product created and published."
              : "Draft product created."
            : finalIsActive
              ? "Product saved and published."
              : "Product saved as draft."
          : body.error ?? "Product save failed."
      });
    } catch {
      setStatus({ tone: "error", message: "Product save failed." });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]" onSubmit={submit}>
      <div className="grid gap-5">
        <EditorCard title="Product Identity" description="The public name, URL handle, and product copy for this canonical stand product.">
          <div className="grid gap-4 md:grid-cols-2">
            <Input name="title" label="Title" defaultValue={product.title} placeholder="Google Review Stand" />
            <Input name="slug" label="Slug / URL handle" defaultValue={product.slug} placeholder="google-review-stand" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Input name="sku" label="SKU" defaultValue={product.sku} placeholder="Generated from slug if empty" required={false} />
            <label className="grid gap-2 text-sm font-bold text-ink">
              Stock
              <select className="rounded-md border border-line bg-white px-3 py-2.5 font-normal" name="stockStatus" defaultValue={product.stockStatus}>
                <option value="instock">In stock</option>
                <option value="outofstock">Out of stock</option>
              </select>
            </label>
          </div>
          <Textarea name="shortDescription" label="Short description" defaultValue={product.shortDescription} required={false} />
          <Textarea name="description" label="Full description" defaultValue={product.description} required={false} tall />
          <div className="rounded-md border border-line bg-[#f7f8fa] px-3 py-2 text-xs font-semibold text-muted">
            Current status: <span className="font-black text-ink">{publishStatus}</span>
          </div>
        </EditorCard>

        <EditorCard title="Media / Product Assets" description="These assets control product cards, product pages, proofs, and production templates.">
          {isHostedProduct ? (
            <div className="grid gap-3">
              <AssetRow
                label="Multi-Link angled image"
                description="Used for the hosted product card and product detail page."
                value={assetSet.multiLinkAngledImageUrl}
                required
                onChange={(value) => updateAsset("multiLinkAngledImageUrl", value)}
                onRemove={() => updateAsset("multiLinkAngledImageUrl", "")}
              />
              <AssetRow
                label="Multi-Link front template"
                description="Used for the branded front proof and print template."
                value={assetSet.multiLinkFrontTemplateUrl}
                required
                onChange={(value) => updateAsset("multiLinkFrontTemplateUrl", value)}
                onRemove={() => updateAsset("multiLinkFrontTemplateUrl", "")}
              />
              <label className="flex items-center justify-between gap-3 rounded-md border border-line bg-white p-3 text-sm font-bold text-ink">
                <span>
                  Landing page preview configuration
                  <span className="mt-1 block text-xs font-normal text-muted">Required before Hosted Multi-Link can be active.</span>
                </span>
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-line accent-brand"
                  checked={assetSet.landingPagePreviewReady}
                  onChange={(event) => setAssetSet((current) => ({ ...current, landingPagePreviewReady: event.target.checked }))}
                />
              </label>
            </div>
          ) : (
            <div className="grid gap-3">
              <AssetRow
                label="Standard Direct angled image"
                description="Used for the standard stand product card and detail image."
                value={assetSet.standardAngledImageUrl}
                required
                onChange={(value) => updateAsset("standardAngledImageUrl", value)}
                onRemove={() => updateAsset("standardAngledImageUrl", "")}
              />
              <AssetRow
                label="Branded + QR angled image"
                description="Used when showing the branded purchase option."
                value={assetSet.brandedAngledImageUrl}
                required
                onChange={(value) => updateAsset("brandedAngledImageUrl", value)}
                onRemove={() => updateAsset("brandedAngledImageUrl", "")}
              />
              <AssetRow
                label="Branded front template"
                description="Used for the customer front proof and print-ready template."
                value={assetSet.brandedFrontTemplateUrl}
                required
                onChange={(value) => updateAsset("brandedFrontTemplateUrl", value)}
                onRemove={() => updateAsset("brandedFrontTemplateUrl", "")}
              />
              <AssetRow
                label="Standard front template"
                description="Optional reference template for standard locked stands."
                value={assetSet.standardFrontTemplateUrl}
                onChange={(value) => updateAsset("standardFrontTemplateUrl", value)}
                onRemove={() => updateAsset("standardFrontTemplateUrl", "")}
              />
              <AssetRow
                label="Center platform/icon asset"
                description="Optional platform mark or center art used by proof generation."
                value={assetSet.centerAssetUrl}
                onChange={(value) => updateAsset("centerAssetUrl", value)}
                onRemove={() => updateAsset("centerAssetUrl", "")}
              />
            </div>
          )}
        </EditorCard>

        <EditorCard title="Setup / Purchase Options" description="Customer purchase options live inside one canonical product. They are not separate products.">
          <div className="grid gap-3">
            {visibleOptions.map((option) => (
              <SetupOptionEditor
                key={option.optionCode}
                option={option}
                onChange={(patch) => updateOption(option.optionCode, patch)}
              />
            ))}
          </div>
        </EditorCard>

        <EditorCard title="Destination / Platform" description="Stand type is what the stand does. Platform is where the customer is sent.">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold text-ink">
              Destination type
              <select
                className="rounded-md border border-line bg-white px-3 py-2.5 font-normal"
                value={destinationType}
                onChange={(event) => setDestinationType(event.target.value)}
              >
                <option value="review">Review</option>
                <option value="review_social">Review or social</option>
                <option value="booking">Booking</option>
                <option value="menu">Menu</option>
                <option value="menu_order">Menu/order</option>
                <option value="order">Order</option>
                <option value="reservation">Reservation</option>
                <option value="website">Website</option>
                <option value="social">Social</option>
                <option value="payment">Payment</option>
                <option value="loyalty">Loyalty</option>
                <option value="custom">Custom URL</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-bold text-ink">
              Platform / destination
              <select
                className="rounded-md border border-line bg-white px-3 py-2.5 font-normal"
                value={primaryPlatformSlug}
                onChange={(event) => {
                  setPrimaryPlatformSlug(event.target.value);
                  setDestinationType(selectedPlatformDestinationType(platforms, event.target.value));
                }}
              >
                {platforms.map((platform) => (
                  <option key={platform.slug} value={platform.slug}>
                    {platform.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <InfoPill label="Google Places" value={primaryPlatform?.googlePlacesEnabled ? "Enabled" : "Not used"} />
            <InfoPill label="Manual fallback" value={primaryPlatform?.manualUrlAllowed ? "Allowed" : "Blocked"} />
          </div>
        </EditorCard>

        <EditorCard title="Template / Proof Settings" description="Controls the default stand wording and production proof expectations.">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              name="defaultCtaText"
              label="Default CTA text"
              defaultValue={product.defaultCtaText ?? defaultCtaForProduct(productKind)}
              required={false}
            />
            <label className="grid gap-2 text-sm font-bold text-ink">
              CTA editable
              <select
                className="rounded-md border border-line bg-white px-3 py-2.5 font-normal"
                value={ctaEditable ? "true" : "false"}
                onChange={(event) => setCtaEditable(event.target.value === "true")}
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </label>
          </div>
          <div className="grid gap-2 text-sm text-muted">
            <RuleRow label="Standard Direct" value="NFC only. No logo zone, business name zone, QR zone, or design step." />
            <RuleRow label="Branded + QR" value="Logo zone, business name zone, QR zone, and front proof required." />
            <RuleRow label="Hosted Multi-Link" value="Logo, business name, QR, hosted page preview, account, and subscription readiness required." />
          </div>
        </EditorCard>

        <EditorCard title="SEO" description="Metadata used when this product is published.">
          <Input name="seoTitle" label="SEO title" defaultValue={product.seoTitle ?? ""} required={false} />
          <Textarea name="seoDescription" label="Meta description" defaultValue={product.seoDescription ?? ""} required={false} />
          <div className="rounded-md border border-line bg-[#f7f8fa] px-3 py-2 text-xs text-muted">
            URL preview: /product/{product.slug || "product-handle"}
          </div>
        </EditorCard>
      </div>

      <aside className="grid content-start gap-5">
        <SidebarCard title="Status">
          <label className="grid gap-2 text-sm font-bold text-ink">
            Product status
            <select
              className="rounded-md border border-line bg-white px-3 py-2.5 font-normal"
              value={publishStatus}
              onChange={(event) => setPublishStatus(event.target.value as "draft" | "active" | "archived")}
            >
              <option value="draft">Draft</option>
              <option value="active" disabled={!canActivate}>
                Active
              </option>
              <option value="archived">Archived</option>
            </select>
          </label>
          {!canActivate ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-ink">
              <p className="font-black">Required assets are missing. This product cannot be activated yet.</p>
              <ul className="mt-2 list-disc space-y-1 pl-4">
                {activationIssues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-md border border-teal-100 bg-teal-50 p-3 text-xs font-bold text-brand">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Ready to publish.
            </div>
          )}
        </SidebarCard>

        <SidebarCard title="Publishing">
          <div className="grid gap-2 text-sm">
            <InfoPill label="Storefront" value={publishStatus === "active" && canActivate ? "Visible" : "Hidden"} />
            <InfoPill label="Admin" value="Editable" />
          </div>
        </SidebarCard>

        <SidebarCard title="Product Organization">
          <label className="grid gap-2 text-sm font-bold text-ink">
            Product kind
            <select
              className="rounded-md border border-line bg-white px-3 py-2.5 font-normal"
              value={productKind}
              onChange={(event) => updateProductKind(event.target.value as ProductKind)}
            >
              <option value="normal_direct">Direct stand</option>
              <option value="custom_direct">Custom stand product</option>
              <option value="hosted_multilink">Hosted Multi-Link</option>
              <option value="bundle">Bundle</option>
            </select>
          </label>
          <label className="grid gap-2 text-sm font-bold text-ink">
            Stand Type
            <select
              className="rounded-md border border-line bg-white px-3 py-2.5 font-normal"
              value={standTypeSlug}
              onChange={(event) => setStandTypeSlug(event.target.value)}
            >
              {standTypes.map((standType) => (
                <option key={standType.slug} value={standType.slug}>
                  {standType.title}
                </option>
              ))}
            </select>
          </label>
          <fieldset className="grid gap-2">
            <legend className="text-sm font-bold text-ink">Business Uses</legend>
            <div className="grid max-h-56 gap-2 overflow-auto rounded-md border border-line bg-white p-2">
              {businessUses.map((businessUse) => (
                <label key={businessUse.slug} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm text-ink hover:bg-gray-50">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-line accent-brand"
                    checked={businessUseSlugs.includes(businessUse.slug)}
                    onChange={() => toggleBusinessUse(businessUse.slug)}
                  />
                  {businessUse.title}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="flex items-center justify-between gap-3 rounded-md border border-line bg-white px-3 py-2 text-sm font-bold text-ink">
            Special solution
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-line accent-brand"
              checked={isSpecialSolution}
              onChange={(event) => setIsSpecialSolution(event.target.checked)}
            />
          </label>
        </SidebarCard>

        <SidebarCard title="Pricing Summary">
          <p className="text-2xl font-black text-ink">{pricingSummary || formatPrice(product.basePriceCents)}</p>
          <div className="mt-3 grid gap-2 text-sm text-muted">
            {activeVisibleOptions.map((option) => (
              <div className="flex justify-between gap-3" key={option.optionCode}>
                <span>{option.title}</span>
                <span className="font-bold text-ink">
                  {formatPrice(option.priceCents)}
                  {option.monthlyPriceCents ? ` + ${formatPrice(option.monthlyPriceCents)}/mo` : ""}
                </span>
              </div>
            ))}
          </div>
        </SidebarCard>

        <SidebarCard title="Asset Readiness">
          <ReadinessLine label="Standard image" ready={Boolean(assetSet.standardAngledImageUrl)} />
          <ReadinessLine label="Branded image" ready={Boolean(assetSet.brandedAngledImageUrl)} />
          <ReadinessLine label="Branded front template" ready={Boolean(assetSet.brandedFrontTemplateUrl)} />
          {isHostedProduct ? (
            <>
              <ReadinessLine label="Multi-Link image" ready={Boolean(assetSet.multiLinkAngledImageUrl)} />
              <ReadinessLine label="Multi-Link template" ready={Boolean(assetSet.multiLinkFrontTemplateUrl)} />
              <ReadinessLine label="Landing preview" ready={assetSet.landingPagePreviewReady} />
            </>
          ) : null}
          <div className="mt-2 rounded-md bg-[#f7f8fa] px-3 py-2 text-xs font-bold text-ink">
            Can publish: {canActivate ? "Yes" : "No"}
          </div>
        </SidebarCard>

        <SidebarCard title="Production Notes">
          <ul className="grid gap-2 text-xs leading-5 text-muted">
            <li>Standard Direct is NFC only and does not include a printed QR code.</li>
            <li>Branded + QR requires logo collection, business name, QR generation, and front proof.</li>
            <li>Hosted Multi-Link requires account, hosted page, subscription readiness, and landing page preview.</li>
          </ul>
        </SidebarCard>

        <button
          className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-ink px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
          disabled={isSaving}
        >
          <Save className="h-4 w-4" aria-hidden="true" />
          {isSaving ? "Saving..." : mode === "create" ? "Save draft" : "Save product"}
        </button>
        {status ? (
          <p className={status.tone === "success" ? "text-sm font-bold text-brand" : "text-sm font-bold text-red-600"}>
            {status.message}
          </p>
        ) : null}
        <Link className="text-center text-sm font-bold text-muted hover:text-ink" href="/admin/products">
          Back to products
        </Link>
      </aside>
    </form>
  );
}

function EditorCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 rounded-lg border border-line bg-white p-4 shadow-sm md:p-5">
      <div>
        <h2 className="text-base font-black text-ink">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
      </div>
      {children}
    </section>
  );
}

function SidebarCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-3 rounded-lg border border-line bg-white p-4 shadow-sm">
      <h2 className="text-sm font-black text-ink">{title}</h2>
      {children}
    </section>
  );
}

function SetupOptionEditor({ option, onChange }: { option: ProductOption; onChange: (patch: Partial<ProductOption>) => void }) {
  return (
    <div className="rounded-md border border-line bg-[#f7f8fa] p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-black text-ink">{option.title}</h3>
            <code className="rounded bg-white px-2 py-1 text-xs font-bold text-muted">{option.optionCode}</code>
          </div>
          <p className="mt-1 text-sm leading-6 text-muted">{option.description}</p>
        </div>
        <label className="flex items-center gap-2 text-sm font-bold text-ink">
          Enabled
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-line accent-brand"
            checked={option.isActive}
            onChange={(event) => onChange({ isActive: event.target.checked })}
          />
        </label>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <NumberInput label="Price cents" value={option.priceCents} onChange={(priceCents) => onChange({ priceCents })} />
        {option.optionCode === "hosted_multilink" ? (
          <>
            <NumberInput
              label="Monthly cents"
              value={option.monthlyPriceCents ?? 990}
              onChange={(monthlyPriceCents) => onChange({ monthlyPriceCents })}
            />
            <NumberInput label="Max links" value={option.maxLinks ?? 10} onChange={(maxLinks) => onChange({ maxLinks })} />
          </>
        ) : null}
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <RulePill active={option.requiresDestinationUrl} label="Requires destination link" />
        <RulePill active={option.hasQr} label="Printed QR" />
        <RulePill active={option.requiresLogo} label="Logo required" />
        <RulePill active={option.requiresBusinessName} label="Business name required" />
        <RulePill active={option.requiresDesignStep} label="Design step" />
        <RulePill active={option.requiresFrontProof} label="Front proof" />
        <RulePill active={option.accountRequired} label="Account required" />
        <RulePill active={option.requiresSubscription} label="Subscription" />
        {option.optionCode === "hosted_multilink" ? (
          <>
            <RulePill active={option.supportsReorderableLinks} label="Reorder links" />
            <RulePill active={option.supportsLinkVisibility} label="Show/hide links" />
            <RulePill active={Boolean(option.landingPageUrlPattern)} label={option.landingPageUrlPattern ?? "/l/:client-name"} />
            <RulePill active={Boolean(option.footerLabel)} label={option.footerLabel ?? "Powered by Tap Rater"} />
          </>
        ) : null}
      </div>
    </div>
  );
}

function AssetRow({
  label,
  description,
  value,
  required = false,
  onChange,
  onRemove
}: {
  label: string;
  description: string;
  value: string;
  required?: boolean;
  onChange: (value: string) => void;
  onRemove: () => void;
}) {
  const ready = Boolean(value);

  return (
    <div className="grid gap-3 rounded-md border border-line bg-white p-3 md:grid-cols-[88px_minmax(0,1fr)_auto] md:items-center">
      <div className="grid h-20 w-full place-items-center overflow-hidden rounded-md border border-line bg-[#f7f8fa] md:w-20">
        {ready ? (
          <img src={value} alt="" className="h-full w-full object-contain" loading="lazy" />
        ) : (
          <ImageIcon className="h-5 w-5 text-muted" aria-hidden="true" />
        )}
      </div>
      <div className="grid gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-black text-ink">{label}</p>
          <span className={ready ? "rounded-full bg-teal-50 px-2 py-1 text-xs font-black text-brand" : "rounded-full bg-red-50 px-2 py-1 text-xs font-black text-red-700"}>
            {ready ? "Ready" : required ? "Missing" : "Optional"}
          </span>
        </div>
        <p className="text-xs leading-5 text-muted">{description}</p>
        <input
          className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-ink"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="/uploads/products/example.png"
        />
      </div>
      <button
        type="button"
        className="rounded-md border border-line px-3 py-2 text-sm font-bold text-ink hover:border-red-200 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-40"
        disabled={!ready}
        onClick={onRemove}
      >
        Remove
      </button>
    </div>
  );
}

function Input({
  name,
  label,
  defaultValue,
  placeholder,
  required = true
}: {
  name: string;
  label: string;
  defaultValue: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-ink">
      {label}
      <input
        className="rounded-md border border-line bg-white px-3 py-2.5 font-normal text-ink"
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
      />
    </label>
  );
}

function NumberInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <label className="grid gap-2 text-sm font-bold text-ink">
      {label}
      <input
        className="rounded-md border border-line bg-white px-3 py-2.5 font-normal text-ink"
        inputMode="numeric"
        value={String(value)}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
      />
    </label>
  );
}

function Textarea({
  name,
  label,
  defaultValue,
  tall = false,
  required = true
}: {
  name: string;
  label: string;
  defaultValue: string;
  tall?: boolean;
  required?: boolean;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-ink">
      {label}
      <textarea
        className={`${tall ? "min-h-36" : "min-h-20"} rounded-md border border-line bg-white px-3 py-2.5 font-normal text-ink`}
        name={name}
        defaultValue={defaultValue}
        required={required}
      />
    </label>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-[#f7f8fa] px-3 py-2">
      <p className="text-[11px] font-black uppercase text-muted">{label}</p>
      <p className="mt-1 text-sm font-bold text-ink">{value}</p>
    </div>
  );
}

function RuleRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 rounded-md border border-line bg-white px-3 py-2">
      <span className="min-w-32 text-xs font-black uppercase text-ink">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function RulePill({ active, label }: { active: boolean; label: string }) {
  return (
    <span className={active ? "rounded-full bg-teal-50 px-3 py-1 text-xs font-black text-brand" : "rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-muted"}>
      {label}
    </span>
  );
}

function ReadinessLine({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted">{label}</span>
      {ready ? <CheckCircle2 className="h-4 w-4 text-brand" aria-label="Ready" /> : <XCircle className="h-4 w-4 text-red-600" aria-label="Missing" />}
    </div>
  );
}

function buildInitialOptions(productKind: ProductKind, productOptions: ProductOption[], optionTemplates: ProductOption[]) {
  const templateMap = new Map([...getDefaultOptionsForProductKind(productKind), ...optionTemplates].map((option) => [option.optionCode, option]));
  const savedOptionMap = new Map(productOptions.map((option) => [option.optionCode, option]));
  const codes: ProductOptionCode[] = ["standard_direct", "branded_qr_direct", "hosted_multilink"];

  return codes.map((code) => ({
    ...(templateMap.get(code) ?? getDefaultOptionsForProductKind(code === "hosted_multilink" ? "hosted_multilink" : "normal_direct").find((option) => option.optionCode === code)!),
    ...(savedOptionMap.get(code) ?? {})
  }));
}

function getOrganizationIssues({
  productKind,
  standTypeSlug,
  primaryPlatformSlug,
  destinationType,
  businessUseSlugs,
  isSpecialSolution
}: {
  productKind: ProductKind;
  standTypeSlug: string;
  primaryPlatformSlug: string;
  destinationType: string;
  businessUseSlugs: string[];
  isSpecialSolution: boolean;
}) {
  const issues: string[] = [];

  if (!standTypeSlug) issues.push("Missing stand type");
  if (!destinationType) issues.push("Missing destination type");
  if (!primaryPlatformSlug) issues.push("Missing platform / destination");
  if (productKind !== "hosted_multilink" && !isSpecialSolution && businessUseSlugs.length === 0) {
    issues.push("Missing business use");
  }

  return issues;
}

function cleanAssetSet(assetSet: AssetSetState) {
  return {
    standardAngledImageUrl: readOptionalString(assetSet.standardAngledImageUrl),
    brandedAngledImageUrl: readOptionalString(assetSet.brandedAngledImageUrl),
    multiLinkAngledImageUrl: readOptionalString(assetSet.multiLinkAngledImageUrl),
    standardFrontTemplateUrl: readOptionalString(assetSet.standardFrontTemplateUrl),
    brandedFrontTemplateUrl: readOptionalString(assetSet.brandedFrontTemplateUrl),
    multiLinkFrontTemplateUrl: readOptionalString(assetSet.multiLinkFrontTemplateUrl),
    centerAssetUrl: readOptionalString(assetSet.centerAssetUrl),
    landingPagePreviewConfig: assetSet.landingPagePreviewReady ? { ready: true } : undefined
  };
}

function collectImagesFromAssets(assetSet: AssetSetState, title: string): MigratedProduct["images"] {
  const sources = [
    assetSet.standardAngledImageUrl,
    assetSet.brandedAngledImageUrl,
    assetSet.multiLinkAngledImageUrl,
    assetSet.standardFrontTemplateUrl,
    assetSet.brandedFrontTemplateUrl,
    assetSet.multiLinkFrontTemplateUrl
  ];

  return sources
    .map(readOptionalString)
    .filter((source): source is string => Boolean(source))
    .map((src) => ({ src, alt: title }));
}

function categorySlugForStandType(standTypeSlug: string): MigratedProduct["categorySlug"] {
  const map: Record<string, MigratedProduct["categorySlug"]> = {
    "review-stands": "reviews",
    "social-media-stands": "social-media",
    "appointment-reservation-stands": "appointments",
    "feedback-survey-stands": "feedback",
    "menu-info-stands": "menu",
    "website-link-stands": "website-links",
    "payment-tip-donation-stands": "website-links",
    "loyalty-rewards-stands": "website-links",
    "custom-stands": "custom-stands"
  };

  return map[standTypeSlug] ?? "website-links";
}

function selectedPlatformDestinationType(platforms: PlatformDestination[], platformSlug: string) {
  return platforms.find((platform) => platform.slug === platformSlug)?.destinationType ?? "custom";
}

function getSupportedDestinations(platformSlug: string): SupportedDestination[] {
  const supported = new Set<SupportedDestination>([
    "google",
    "facebook",
    "yelp",
    "tripadvisor",
    "trustpilot",
    "bbb",
    "nextdoor",
    "instagram",
    "tiktok",
    "linkedin",
    "x",
    "youtube",
    "vagaro",
    "booksy",
    "fresha",
    "zocdoc",
    "calendly",
    "acuity",
    "square-appointments",
    "custom-booking-url",
    "booking",
    "toast",
    "doordash",
    "ubereats",
    "grubhub",
    "opentable",
    "resy",
    "custom-menu-url",
    "website",
    "menu",
    "wifi",
    "feedback",
    "referral",
    "payment-url",
    "loyalty-url",
    "custom-url",
    "custom"
  ]);

  return supported.has(platformSlug as SupportedDestination) ? [platformSlug as SupportedDestination] : ["custom"];
}

function formatOptionPricing(options: ProductOption[]) {
  if (options.length === 0) return "";
  if (options.length === 1) {
    const option = options[0];
    return option.monthlyPriceCents ? `${formatPrice(option.priceCents)} + ${formatPrice(option.monthlyPriceCents)}/mo` : formatPrice(option.priceCents);
  }

  const prices = options.map((option) => option.priceCents).sort((first, second) => first - second);
  return `${formatPrice(prices[0])}-${formatPrice(prices[prices.length - 1])}`;
}

function defaultCtaForProduct(productKind: ProductKind) {
  return productKind === "hosted_multilink" ? "CONNECT WITH US" : "Tap to connect";
}

function generateSku(slug: string) {
  return `TR-${slug.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "PRODUCT"}`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function readRequiredText(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalString(value?: string) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
