"use client";

import { type ChangeEventHandler, type FormEvent, type ReactNode, useMemo, useState } from "react";
import { CheckCircle2, Copy, ExternalLink, Loader2, MoreHorizontal, Save, Trash2, UploadCloud, XCircle } from "lucide-react";
import type { MigratedProduct, ProductColorOption, ProductKind, ProductSizeOption, SupportedDestination } from "@/data/migrated-products";
import type {
  BusinessUse,
  PlatformDestination,
  ProductOption,
  ProductOptionCode,
  StandType
} from "@/lib/catalog-architecture";
import { getDefaultOptionsForProductKind, getProductAssetReadiness, inferProductKind } from "@/lib/catalog-architecture";
import { formatPrice } from "@/lib/products";
import { generateProductSeo } from "@/lib/product-seo";
import { AdminAlert, AdminBadge, AdminButton, AdminCard, AdminExternalButton, AdminInput, AdminLinkButton, AdminSelect, AdminSoftPanel, AdminTextarea } from "./admin-ui";

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

type MediaItemState = {
  src: string;
  alt: string;
};

type MediaUploadRole =
  | "main"
  | "gallery"
  | "standard_angled"
  | "standard_front"
  | "branded_angled"
  | "branded_front_template"
  | "multilink_angled"
  | "multilink_front_template"
  | "center_asset";

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
  const [title, setTitle] = useState(product.title);
  const [slug, setSlug] = useState(product.slug);
  const [slugEdited, setSlugEdited] = useState(mode === "edit" && Boolean(product.slug));
  const [sku, setSku] = useState(product.sku || generateProductSku(product.title));
  const [skuEdited, setSkuEdited] = useState(mode === "edit" && Boolean(product.sku));
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
  const [mainImage, setMainImage] = useState<MediaItemState>(() => product.images[0] ?? { src: product.assetSet?.standardAngledImageUrl ?? "", alt: product.title });
  const [galleryImages, setGalleryImages] = useState<MediaItemState[]>(() => product.images.slice(1, 5));
  const [uploadingRoles, setUploadingRoles] = useState<Record<string, boolean>>({});
  const [mediaErrors, setMediaErrors] = useState<Record<string, string>>({});
  const [optionStates, setOptionStates] = useState<ProductOption[]>(() =>
    buildInitialOptions(productKind, productOptions, optionTemplates)
  );
  const [ctaEditable, setCtaEditable] = useState(product.ctaEditable ?? true);
  const [searchTermsText, setSearchTermsText] = useState((product.searchKeywords ?? []).join("\n"));
  const [sizeOptions, setSizeOptions] = useState<ProductSizeOption[]>(() => product.sizeOptions ?? []);
  const [colorOptions, setColorOptions] = useState<ProductColorOption[]>(() => product.colorOptions ?? []);

  const isHostedProduct = productKind === "hosted_multilink";
  const visibleOptions = useMemo(
    () => optionStates.filter((option) => (isHostedProduct ? hostedOptionCodes : normalOptionCodes).includes(option.optionCode)),
    [isHostedProduct, optionStates]
  );
  const activeVisibleOptions = visibleOptions.filter((option) => option.isActive);
  const effectiveAssetSet = useMemo(
    () => ({
      ...assetSet,
      standardAngledImageUrl: assetSet.standardAngledImageUrl || mainImage.src
    }),
    [assetSet, mainImage.src]
  );
  const readiness = getProductAssetReadiness(
    {
      productKind,
      isSpecialSolution,
      assetSet: {
        standardAngledImageUrl: readOptionalString(effectiveAssetSet.standardAngledImageUrl),
        brandedAngledImageUrl: readOptionalString(effectiveAssetSet.brandedAngledImageUrl),
        multiLinkAngledImageUrl: readOptionalString(effectiveAssetSet.multiLinkAngledImageUrl),
        standardFrontTemplateUrl: readOptionalString(effectiveAssetSet.standardFrontTemplateUrl),
        brandedFrontTemplateUrl: readOptionalString(effectiveAssetSet.brandedFrontTemplateUrl),
        multiLinkFrontTemplateUrl: readOptionalString(effectiveAssetSet.multiLinkFrontTemplateUrl),
        centerAssetUrl: readOptionalString(effectiveAssetSet.centerAssetUrl),
        landingPagePreviewConfig: effectiveAssetSet.landingPagePreviewReady ? { ready: true } : undefined
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
  const basePriceCents = activeVisibleOptions.length > 0 ? Math.min(...activeVisibleOptions.map((option) => option.priceCents)) : product.basePriceCents;
  const seoPreview = useMemo(
    () =>
      generateProductSeo({
        ...product,
        slug: slug || slugify(title) || product.slug,
        title: title || product.title,
        sku: sku || product.sku,
        categorySlug: categorySlugForStandType(standTypeSlug),
        standTypeSlug,
        primaryPlatformSlug,
        destinationType,
        businessUseSlugs,
        isSpecialSolution: isSpecialSolution || productKind === "hosted_multilink",
        productKind,
        basePriceCents,
        salePriceCents: undefined,
        requiresAccount: productKind === "hosted_multilink",
        requiresSubscription: productKind === "hosted_multilink",
        requiresLandingPage: productKind === "hosted_multilink",
        supportedDestinations: getSupportedDestinations(primaryPlatformSlug),
        seoTitle: undefined,
        seoDescription: undefined
      }),
    [
      product,
      slug,
      title,
      sku,
      standTypeSlug,
      primaryPlatformSlug,
      destinationType,
      businessUseSlugs,
      isSpecialSolution,
      productKind,
      basePriceCents
    ]
  );
  const productMediaReady = Boolean(readOptionalString(mainImage.src));
  const mediaWarnings = getAdminMediaWarnings(slug || product.slug, mainImage, galleryImages, effectiveAssetSet);
  const optionReadinessRows = activeVisibleOptions.flatMap((option) =>
    getOptionMediaRequirements(option.optionCode, effectiveAssetSet)
      .filter((requirement) => requirement.required)
      .map((requirement) => ({
        optionTitle: option.title,
        label: requirement.label,
        ready: Boolean(requirement.value)
      }))
  );
  const missingOptionMedia = optionReadinessRows.filter((row) => !row.ready);
  const brandedProductionTemplateMissing = activeVisibleOptions.some((option) => option.optionCode === "branded_qr_direct") && !readOptionalString(effectiveAssetSet.brandedFrontTemplateUrl);

  function updateAsset(key: AssetKey, value: string) {
    setAssetSet((current) => ({ ...current, [key]: value }));
  }

  function updateTitle(value: string) {
    setTitle(value);
    if (!slugEdited) {
      setSlug(slugify(value));
    }
    if (!skuEdited) {
      setSku(generateProductSku(value));
    }
  }

  function updateSlug(value: string) {
    setSlugEdited(true);
    setSlug(slugify(value));
  }

  function updateSku(value: string) {
    setSkuEdited(true);
    setSku(formatSku(value));
  }

  async function uploadMedia(file: File, role: MediaUploadRole) {
    const uploadKey = role;
    setUploadingRoles((current) => ({ ...current, [uploadKey]: true }));
    setMediaErrors((current) => ({ ...current, [uploadKey]: "" }));

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("role", role);
      form.append("productSlug", slug || slugify(title) || "draft-product");

      const response = await fetch("/api/admin/media/upload", {
        method: "POST",
        body: form
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(body.error ?? "Image upload failed.");
      }

      const uploadedUrl = readOptionalString(body.asset?.url);
      if (!uploadedUrl) {
        throw new Error("Image upload did not return a usable media URL.");
      }

      return uploadedUrl;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Image upload failed.";
      setMediaErrors((current) => ({ ...current, [uploadKey]: message }));
      return null;
    } finally {
      setUploadingRoles((current) => ({ ...current, [uploadKey]: false }));
    }
  }

  async function uploadMainImage(file: File) {
    const uploadedUrl = await uploadMedia(file, "main");
    if (uploadedUrl) {
      setMainImage({ src: uploadedUrl, alt: title });
    }
  }

  async function uploadGalleryImage(file: File, index?: number) {
    const uploadedUrl = await uploadMedia(file, "gallery");
    if (!uploadedUrl) return;

    setGalleryImages((current) => {
      const next = [...current];
      if (typeof index === "number") {
        next[index] = { src: uploadedUrl, alt: title };
      } else {
        next.push({ src: uploadedUrl, alt: title });
      }
      return next.slice(0, 5);
    });
  }

  async function uploadAssetImage(file: File, key: AssetKey, role: MediaUploadRole) {
    const uploadedUrl = await uploadMedia(file, role);
    if (uploadedUrl) {
      updateAsset(key, uploadedUrl);
    }
  }

  function updateOption(optionCode: ProductOptionCode, patch: Partial<ProductOption>) {
    setOptionStates((current) => current.map((option) => (option.optionCode === optionCode ? { ...option, ...patch } : option)));
  }

  function updateSizeOption(index: number, patch: Partial<ProductSizeOption>) {
    setSizeOptions((current) => current.map((size, itemIndex) => (itemIndex === index ? { ...size, ...patch } : size)));
  }

  function updateColorOption(index: number, patch: Partial<ProductColorOption>) {
    setColorOptions((current) => current.map((color, itemIndex) => (itemIndex === index ? { ...color, ...patch } : color)));
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
    const finalTitle = readRequiredText(title);
    const finalSlug = slugify(slug || finalTitle);
    const finalSku = readOptionalString(sku) ?? generateProductSku(finalTitle);
    const finalStatus = publishStatus === "active" && canActivate ? "active" : publishStatus === "archived" ? "archived" : "draft";
    const finalIsActive = finalStatus === "active";
    const finalOptions = visibleOptions.map((option) => ({ ...option, priceCents: Math.max(0, Math.round(option.priceCents)) }));
    const finalActiveOptions = finalOptions.filter((option) => option.isActive);
    const basePriceCents = finalActiveOptions.length > 0 ? Math.min(...finalActiveOptions.map((option) => option.priceCents)) : 3900;
    const supportedDestinations = getSupportedDestinations(primaryPlatformSlug);
    const shortDescription = readOptionalString(String(form.get("shortDescription") ?? "")) ?? `${finalTitle} NFC stand.`;
    const description = readOptionalString(String(form.get("description") ?? "")) ?? shortDescription;
    const defaultCtaText = readOptionalString(String(form.get("defaultCtaText") ?? "")) ?? defaultCtaForProduct(productKind);

    try {
      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: finalSlug,
          title: finalTitle,
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
          assetSet: cleanAssetSet(assetSet, mainImage.src),
          defaultCtaText,
          ctaEditable,
          assetReadinessStatus: readiness.status,
          productOptions: finalOptions,
          images: collectImagesFromMedia(mainImage, galleryImages, assetSet, finalTitle),
          seoTitle: readOptionalString(String(form.get("seoTitle") ?? "")),
          seoDescription: readOptionalString(String(form.get("seoDescription") ?? "")),
          searchKeywords: parseMultiline(searchTermsText),
          sizeOptions,
          colorOptions,
          keyFeatures: product.keyFeatures ?? [],
          howItWorks: product.howItWorks ?? [],
          specifications: product.specifications ?? [],
          includedItems: product.includedItems ?? [],
          productFaqs: product.productFaqs ?? [],
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
    <form className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]" onSubmit={submit}>
      <div className="grid gap-4">
        <EditorCard title="Basic" description="The public name, URL handle, SKU, stock, and customer-facing product copy.">
          <div className="grid gap-4 md:grid-cols-2">
            <ControlledInput
              name="title"
              label="Title"
              value={title}
              placeholder="Google Review Stand"
              onChange={updateTitle}
            />
            <ControlledInput
              name="slug"
              label="Slug / URL handle"
              value={slug}
              placeholder="google-review-stand"
              helper={slugEdited ? "Edited manually" : "Auto-generated from title"}
              onChange={updateSlug}
            />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <ControlledInput
              name="sku"
              label="SKU base"
              value={sku}
              placeholder="GRS"
              required={false}
              helper={skuEdited ? "Edited manually" : "Auto-generated from title"}
              onChange={updateSku}
            />
            <label className="grid gap-2 text-sm font-semibold text-ink">
              Stock
              <AdminSelect name="stockStatus" defaultValue={product.stockStatus}>
                <option value="instock">In stock</option>
                <option value="outofstock">Out of stock</option>
              </AdminSelect>
            </label>
          </div>
          <Textarea name="shortDescription" label="Short description" defaultValue={product.shortDescription} required={false} />
          <Textarea name="description" label="Full description" defaultValue={product.description} required={false} tall />
          <AdminSoftPanel className="px-3 py-2 text-xs font-semibold text-muted">
            Current status: <span className="font-semibold text-ink">{publishStatus}</span>
          </AdminSoftPanel>
        </EditorCard>

        <EditorCard title="Media" description="Storefront media for product cards and product pages. Drag images onto a tile or click to upload.">
          <ProductMediaGrid
            title={title}
            mainImage={mainImage}
            galleryImages={galleryImages}
            requiredMain={publishStatus === "active"}
            uploadingRoles={uploadingRoles}
            mediaErrors={mediaErrors}
            onUploadMain={uploadMainImage}
            onUploadGallery={uploadGalleryImage}
            onReplaceMedia={(nextMainImage, nextGalleryImages) => {
              setMainImage(nextMainImage);
              setGalleryImages(nextGalleryImages);
            }}
          />
        </EditorCard>

        <EditorCard title="Purchase Options" description="Customer purchase options live inside one canonical product. They are not separate products.">
          <div className="grid gap-3">
            {visibleOptions.map((option) => (
              <SetupOptionEditor
                key={option.optionCode}
                option={option}
                skuBase={sku || generateProductSku(title)}
                assetSet={effectiveAssetSet}
                uploadingRoles={uploadingRoles}
                mediaErrors={mediaErrors}
                onChange={(patch) => updateOption(option.optionCode, patch)}
                onUploadAsset={uploadAssetImage}
                onUpdateAsset={updateAsset}
                onSetLandingPreview={(ready) => setAssetSet((current) => ({ ...current, landingPagePreviewReady: ready }))}
              />
            ))}
          </div>
        </EditorCard>

        <EditorCard title="Destination" description="Stand type is what the stand does. Platform is where the customer is sent.">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-ink">
              Destination type
              <AdminSelect
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
              </AdminSelect>
            </label>
            <label className="grid gap-2 text-sm font-semibold text-ink">
              Platform / destination
              <AdminSelect
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
              </AdminSelect>
            </label>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <InfoPill label="Google Places" value={primaryPlatform?.googlePlacesEnabled ? "Enabled" : "Not used"} />
            <InfoPill label="Manual fallback" value={primaryPlatform?.manualUrlAllowed ? "Allowed" : "Blocked"} />
          </div>
        </EditorCard>

        <EditorCard title="Production Assets" description="Controls the default stand wording and production proof expectations.">
          <div className="grid gap-4 md:grid-cols-2">
            <Input
              name="defaultCtaText"
              label="Default CTA text"
              defaultValue={product.defaultCtaText ?? defaultCtaForProduct(productKind)}
              required={false}
            />
            <label className="grid gap-2 text-sm font-semibold text-ink">
              CTA editable
              <AdminSelect
                value={ctaEditable ? "true" : "false"}
                onChange={(event) => setCtaEditable(event.target.value === "true")}
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </AdminSelect>
            </label>
          </div>
          <div className="grid gap-2 text-sm text-muted">
            <RuleRow label="Standard Direct" value="NFC direct. No logo zone, business name zone, QR zone, or design step." />
            <RuleRow label="Branded + QR" value="Logo zone, business name zone, QR zone, and front proof required." />
            <RuleRow label="Hosted Multi-Link" value="Logo, business name, QR, hosted page preview, account, and subscription readiness required." />
          </div>
        </EditorCard>

        <EditorCard title="Variants" description="Structured size and color options. A price-pending size is visible for QA but blocked from checkout.">
          <div className="grid gap-4">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-black text-ink">Size options</p>
                <AdminButton type="button" variant="outline" onClick={() => setSizeOptions((current) => [...current, createSizeOption(current.length)])}>
                  Add size
                </AdminButton>
              </div>
              <div className="mt-3 grid gap-3">
                {sizeOptions.map((size, index) => (
                  <div key={`${size.code}-${index}`} className="grid gap-3 rounded-md border border-line bg-white p-3 text-sm">
                    <div className="grid gap-3 md:grid-cols-4">
                      <VariantTextInput label="Label" value={size.label} onChange={(value) => updateSizeOption(index, { label: value })} />
                      <VariantTextInput label="Code" value={size.code} onChange={(value) => updateSizeOption(index, { code: slugify(value) })} />
                      <VariantTextInput label="SKU suffix" value={size.skuSuffix} onChange={(value) => updateSizeOption(index, { skuSuffix: formatSku(value) })} />
                      <VariantPriceInput
                        label="Price adjustment"
                        value={size.priceAdjustmentCents}
                        onChange={(value) => updateSizeOption(index, { priceAdjustmentCents: value })}
                      />
                    </div>
                    <div className="grid gap-3 md:grid-cols-4">
                      <VariantNumberInput label="Front width mm" value={size.frontWidthMm} onChange={(value) => updateSizeOption(index, { frontWidthMm: value })} />
                      <VariantNumberInput label="Front height mm" value={size.frontHeightMm} onChange={(value) => updateSizeOption(index, { frontHeightMm: value })} />
                      <VariantNumberInput label="Front width in" value={size.frontWidthIn} step="0.01" onChange={(value) => updateSizeOption(index, { frontWidthIn: value })} />
                      <VariantNumberInput label="Front height in" value={size.frontHeightIn} step="0.01" onChange={(value) => updateSizeOption(index, { frontHeightIn: value })} />
                    </div>
                    <div className="grid gap-3 md:grid-cols-4">
                      <VariantNumberInput label="Base depth mm" value={size.baseDepthMm} onChange={(value) => updateSizeOption(index, { baseDepthMm: value })} />
                      <VariantNumberInput label="Base depth in" value={size.baseDepthIn} step="0.01" onChange={(value) => updateSizeOption(index, { baseDepthIn: value })} />
                      <VariantBooleanSelect label="Active" value={size.isActive} onChange={(value) => updateSizeOption(index, { isActive: value })} />
                      <VariantBooleanSelect
                        label="Default"
                        value={size.isDefault}
                        onChange={(value) =>
                          setSizeOptions((current) => current.map((item, itemIndex) => ({ ...item, isDefault: itemIndex === index ? value : value ? false : item.isDefault })))
                        }
                      />
                    </div>
                    <div className="flex justify-end">
                      <AdminButton type="button" variant="danger" onClick={() => setSizeOptions((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                        Remove size
                      </AdminButton>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-black text-ink">Color options</p>
                <AdminButton type="button" variant="outline" onClick={() => setColorOptions((current) => [...current, createColorOption(current.length)])}>
                  Add color
                </AdminButton>
              </div>
              <div className="mt-3 grid gap-3">
                {colorOptions.map((color, index) => (
                  <div key={`${color.code}-${index}`} className="grid gap-3 rounded-md border border-line bg-white p-3 text-sm">
                    <div className="grid gap-3 md:grid-cols-5">
                      <VariantTextInput label="Label" value={color.label} onChange={(value) => updateColorOption(index, { label: value })} />
                      <VariantTextInput label="Code" value={color.code} onChange={(value) => updateColorOption(index, { code: slugify(value) })} />
                      <VariantTextInput label="SKU suffix" value={color.skuSuffix} onChange={(value) => updateColorOption(index, { skuSuffix: formatSku(value) })} />
                      <VariantPriceInput label="Price adjustment" value={color.priceAdjustmentCents ?? 0} onChange={(value) => updateColorOption(index, { priceAdjustmentCents: value ?? 0 })} allowPending={false} />
                      <VariantBooleanSelect label="Active" value={color.isActive} onChange={(value) => updateColorOption(index, { isActive: value })} />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <VariantBooleanSelect
                        label="Default"
                        value={color.isDefault}
                        onChange={(value) =>
                          setColorOptions((current) => current.map((item, itemIndex) => ({ ...item, isDefault: itemIndex === index ? value : value ? false : item.isDefault })))
                        }
                      />
                      <AdminButton type="button" variant="danger" onClick={() => setColorOptions((current) => current.filter((_, itemIndex) => itemIndex !== index))}>
                        Remove color
                      </AdminButton>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </EditorCard>

        <EditorCard title="Product Details" description="Structured product content used by the storefront and JSON-LD.">
          <StructuredPreview title="Key Features" rows={(product.keyFeatures ?? []).map((item) => [item.title, item.body])} />
          <StructuredPreview title="How It Works" rows={(product.howItWorks ?? []).map((item) => [String(item.step), `${item.title}: ${item.body}`])} />
          <StructuredPreview title="Specifications" rows={(product.specifications ?? []).map((item) => [item.label, item.value])} />
          <StructuredPreview title="What's Included" rows={(product.includedItems ?? []).map((item) => [item.appliesTo === "branded" ? "Branded" : "All", item.label])} />
          <StructuredPreview title="Product FAQ" rows={(product.productFaqs ?? []).map((item) => [item.question, item.answer])} />
        </EditorCard>

        <EditorCard title="SEO" description="Metadata, internal search terms, canonical preview, and Google-style search preview.">
          <Input
            name="seoTitle"
            label="SEO title override"
            defaultValue={product.seoTitle ?? ""}
            placeholder={seoPreview.generatedTitle}
            required={false}
          />
          <Textarea
            name="seoDescription"
            label="Meta description override"
            defaultValue={product.seoDescription ?? ""}
            placeholder={seoPreview.generatedDescription}
            required={false}
          />
          <Textarea
            name="searchTerms"
            label="Search terms"
            defaultValue={searchTermsText}
            placeholder="One internal search term per line"
            required={false}
            onChange={(event) => setSearchTermsText(event.currentTarget.value)}
          />
          <div className="grid gap-2 rounded-md border border-line bg-[#f7f8fa] px-3 py-3 text-xs text-muted">
            <p>
              <span className="font-black text-ink">URL:</span> /product/{slug || "product-handle"}
            </p>
            <p>
              <span className="font-black text-ink">Generated title:</span> {seoPreview.generatedTitle}
            </p>
            <p>
              <span className="font-black text-ink">Generated meta:</span> {seoPreview.generatedDescription}
            </p>
          </div>
          <div className="rounded-md border border-line bg-white p-4">
            <p className="text-lg font-semibold leading-6 text-[#1a0dab]">{readOptionalString(String(product.seoTitle ?? "")) ?? seoPreview.generatedTitle}</p>
            <p className="mt-1 text-sm text-[#006621]">taprater.com/product/{slug || "product-handle"}</p>
            <p className="mt-1 text-sm leading-5 text-[#545454]">{readOptionalString(String(product.seoDescription ?? "")) ?? seoPreview.generatedDescription}</p>
          </div>
        </EditorCard>
      </div>

      <aside className="grid content-start gap-4">
        <SidebarCard title="Status">
          <label className="grid gap-2 text-sm font-semibold text-ink">
            Product status
            <AdminSelect
              value={publishStatus}
              onChange={(event) => setPublishStatus(event.target.value as "draft" | "active" | "archived")}
            >
              <option value="draft">Draft</option>
              <option value="active" disabled={!canActivate}>
                Active
              </option>
              <option value="archived">Archived</option>
            </AdminSelect>
          </label>
          {!canActivate ? (
            <AdminAlert tone="warning" className="text-xs leading-5">
              <p className="font-semibold">Required assets are missing. This product cannot be activated yet.</p>
              {brandedProductionTemplateMissing ? (
                <p className="mt-2 font-semibold text-red-700">
                  Branded Direct is unavailable until a branded front template is attached for production artwork.
                </p>
              ) : null}
              <ul className="mt-2 list-disc space-y-1 pl-4">
                {activationIssues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            </AdminAlert>
          ) : (
            <AdminAlert tone="success" className="flex items-center gap-2 text-xs">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              Ready to publish.
            </AdminAlert>
          )}
        </SidebarCard>

        <SidebarCard title="Publishing">
          <div className="grid gap-2 text-sm">
            <InfoPill label="Storefront" value={publishStatus === "active" && canActivate ? "Visible" : "Hidden"} />
            <InfoPill label="Admin" value="Editable" />
          </div>
        </SidebarCard>

        <SidebarCard title="Commerce">
          <label className="grid gap-2 text-sm font-semibold text-ink">
            Operational product type
            <AdminSelect
              value={productKind}
              onChange={(event) => updateProductKind(event.target.value as ProductKind)}
            >
              <option value="normal_direct">Direct stand</option>
              <option value="custom_direct">Custom stand product</option>
              <option value="hosted_multilink">Hosted Multi-Link</option>
              <option value="bundle">Bundle</option>
            </AdminSelect>
          </label>
          <label className="grid gap-2 text-sm font-semibold text-ink">
            Stand Type
            <AdminSelect
              value={standTypeSlug}
              onChange={(event) => setStandTypeSlug(event.target.value)}
            >
              {standTypes.map((standType) => (
                <option key={standType.slug} value={standType.slug}>
                  {standType.title}
                </option>
              ))}
            </AdminSelect>
          </label>
        </SidebarCard>

        <SidebarCard title="Business Uses">
          <fieldset className="grid gap-2">
            <legend className="text-sm font-semibold text-ink">Available uses</legend>
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
          <label className="flex items-center justify-between gap-3 rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink">
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
          <p className="text-2xl font-semibold text-ink">{pricingSummary || formatPrice(product.basePriceCents)}</p>
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
          <div className="grid gap-3">
            <AdminSoftPanel className="p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted">Product media</p>
              <ReadinessLine label="Primary product image" ready={productMediaReady} />
            </AdminSoftPanel>
            <AdminSoftPanel className="p-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted">Setup option media</p>
                <AdminBadge tone={missingOptionMedia.length === 0 ? "success" : "danger"}>
                  {missingOptionMedia.length === 0 ? "Ready" : `${missingOptionMedia.length} missing`}
                </AdminBadge>
              </div>
              <div className="mt-2 grid gap-2">
                {optionReadinessRows.length > 0 ? (
                  optionReadinessRows.map((row) => (
                    <ReadinessLine key={`${row.optionTitle}-${row.label}`} label={`${row.optionTitle}: ${row.label}`} ready={row.ready} />
                  ))
                ) : (
                  <ReadinessLine label="Active product option" ready={false} />
                )}
              </div>
            </AdminSoftPanel>
          </div>
          {activeVisibleOptions.some((option) => option.optionCode === "hosted_multilink") ? (
            <ReadinessLine label="Landing preview" ready={assetSet.landingPagePreviewReady} />
          ) : null}
          <div className="mt-2 rounded-md bg-[#f7f8fa] px-3 py-2 text-xs font-bold text-ink">
            Can publish: {canActivate ? "Yes" : "No"}
            {brandedProductionTemplateMissing ? (
              <span className="mt-1 block text-red-700">
                Branded unavailable: missing production front template.
              </span>
            ) : null}
          </div>
          {mediaWarnings.length > 0 ? (
            <AdminAlert tone="warning" className="mt-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-amber-800">Media warnings</p>
              <ul className="mt-2 grid gap-1 text-xs leading-5 text-amber-800">
                {mediaWarnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </AdminAlert>
          ) : null}
        </SidebarCard>

        <SidebarCard title="Production Notes">
          <ul className="grid gap-2 text-xs leading-5 text-muted">
            <li>Standard Direct includes NFC pointed to the customer-provided URL.</li>
            <li>Branded + QR requires logo collection, business name, QR generation, front proof, and a branded front template before publishing.</li>
            <li>Hosted Multi-Link requires account, hosted page, subscription readiness, and landing page preview.</li>
          </ul>
        </SidebarCard>

        <AdminButton type="submit" className="w-full" variant="primary" loading={isSaving} disabled={isSaving}>
          <Save className="h-4 w-4" aria-hidden="true" />
          {isSaving ? "Saving..." : mode === "create" ? "Save draft" : "Save product"}
        </AdminButton>
        {status ? (
          <AdminAlert tone={status.tone === "success" ? "success" : "danger"}>
            {status.message}
          </AdminAlert>
        ) : null}
        <AdminLinkButton className="w-full" variant="outline" href="/admin/products">
          Back to products
        </AdminLinkButton>
        {mode === "edit" && slug ? (
          <AdminExternalButton className="w-full" variant="outline" href={`/product/${slug}`} target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            View in store
          </AdminExternalButton>
        ) : null}
      </aside>
    </form>
  );
}

function EditorCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <AdminCard title={title} description={description}>
      <div className="grid gap-4">{children}</div>
    </AdminCard>
  );
}

function SidebarCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <AdminCard title={title} className="grid gap-3 p-4">
      {children}
    </AdminCard>
  );
}

function ProductMediaGrid({
  title,
  mainImage,
  galleryImages,
  requiredMain,
  uploadingRoles,
  mediaErrors,
  onUploadMain,
  onUploadGallery,
  onReplaceMedia
}: {
  title: string;
  mainImage: MediaItemState;
  galleryImages: MediaItemState[];
  requiredMain: boolean;
  uploadingRoles: Record<string, boolean>;
  mediaErrors: Record<string, string>;
  onUploadMain: (file: File) => void | Promise<void>;
  onUploadGallery: (file: File, index?: number) => void | Promise<void>;
  onReplaceMedia: (mainImage: MediaItemState, galleryImages: MediaItemState[]) => void;
}) {
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const selectedCount = selectedKeys.length;
  const selectedGalleryIndexes = selectedKeys
    .filter((key) => key.startsWith("gallery-"))
    .map((key) => Number(key.replace("gallery-", "")))
    .filter((index) => Number.isInteger(index));
  const selectedGalleryIndex = selectedGalleryIndexes.length === 1 ? selectedGalleryIndexes[0] : undefined;
  const canSetAsMain = selectedCount === 1 && typeof selectedGalleryIndex === "number" && Boolean(galleryImages[selectedGalleryIndex]?.src);
  const filledGalleryCount = galleryImages.filter((image) => Boolean(image.src)).length;

  function isSelected(key: string) {
    return selectedKeys.includes(key);
  }

  function toggleSelected(key: string) {
    setSelectedKeys((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));
  }

  function clearSelection() {
    setSelectedKeys([]);
  }

  function setSelectedGalleryAsMain() {
    if (!canSetAsMain || typeof selectedGalleryIndex !== "number") return;

    const selectedImage = galleryImages[selectedGalleryIndex];
    const nextGalleryImages = [...galleryImages];
    if (mainImage.src) {
      nextGalleryImages[selectedGalleryIndex] = { src: mainImage.src, alt: mainImage.alt || title };
    } else {
      nextGalleryImages.splice(selectedGalleryIndex, 1);
    }

    onReplaceMedia({ src: selectedImage.src, alt: selectedImage.alt || title }, nextGalleryImages.slice(0, 5));
    clearSelection();
  }

  function deleteSelectedMedia() {
    if (selectedCount === 0) return;

    const deleteMain = selectedKeys.includes("main");
    const selectedGallerySet = new Set(selectedGalleryIndexes);
    let nextGalleryImages = galleryImages.filter((_, index) => !selectedGallerySet.has(index));
    let nextMainImage = mainImage;

    if (deleteMain) {
      const promotedImage = nextGalleryImages[0];
      nextMainImage = promotedImage ? { src: promotedImage.src, alt: promotedImage.alt || title } : { src: "", alt: title };
      nextGalleryImages = promotedImage ? nextGalleryImages.slice(1) : nextGalleryImages;
    }

    onReplaceMedia(nextMainImage, nextGalleryImages.slice(0, 5));
    clearSelection();
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs leading-5 text-muted">
          <span className="font-bold text-ink">Main image:</span> {mainImage.src ? "Ready" : requiredMain ? "Missing" : "Optional"}
          <span className="mx-2 text-line">/</span>
          <span className="font-bold text-ink">Gallery:</span> {filledGalleryCount}/5
        </div>
        {selectedCount > 0 ? (
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-line bg-[#f7f8fa] px-2 py-1.5 text-xs font-bold text-ink">
            <span>{selectedCount} selected</span>
            <AdminButton
              type="button"
              className="min-h-8 px-2 py-1 text-xs"
              variant="outline"
              disabled={!canSetAsMain}
              onClick={setSelectedGalleryAsMain}
            >
              Set as main
            </AdminButton>
            <AdminButton type="button" className="min-h-8 px-2 py-1 text-xs" variant="danger" onClick={deleteSelectedMedia}>
              Delete
            </AdminButton>
            <AdminButton type="button" className="min-h-8 px-2 py-1 text-xs" variant="outline" onClick={clearSelection}>
              Clear
            </AdminButton>
          </div>
        ) : null}
      </div>

      <div className="grid auto-rows-[120px] grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        <ProductMediaTile
          label="Main"
          value={mainImage.src}
          required={requiredMain}
          isMain
          isSelected={isSelected("main")}
          isUploading={Boolean(uploadingRoles.main)}
          error={mediaErrors.main}
          onToggleSelected={() => toggleSelected("main")}
          onUpload={onUploadMain}
        />
        {galleryImages.map((image, index) => (
          <ProductMediaTile
            key={`${image.src}-${index}`}
            label={`Gallery ${index + 1}`}
            value={image.src}
            isSelected={isSelected(`gallery-${index}`)}
            isUploading={Boolean(uploadingRoles.gallery)}
            error={mediaErrors.gallery}
            onToggleSelected={() => toggleSelected(`gallery-${index}`)}
            onUpload={(file) => onUploadGallery(file, index)}
          />
        ))}
        {galleryImages.length < 5 ? (
          <ProductMediaTile
            label="Add media"
            value=""
            isUploading={Boolean(uploadingRoles.gallery)}
            error={mediaErrors.gallery}
            onToggleSelected={() => undefined}
            onUpload={(file) => (mainImage.src ? onUploadGallery(file) : onUploadMain(file))}
          />
        ) : null}
      </div>

      <p className="rounded-md border border-line bg-[#f7f8fa] px-3 py-2 text-xs leading-5 text-muted">
        Stored URLs stay in product data but are hidden from the normal editor. Use the tile menu only when you need to view or copy a URL.
      </p>
      <input type="hidden" name="product-media-title" value={title} readOnly />
    </div>
  );
}

function SetupOptionEditor({
  option,
  skuBase,
  assetSet,
  uploadingRoles,
  mediaErrors,
  onChange,
  onUploadAsset,
  onUpdateAsset,
  onSetLandingPreview
}: {
  option: ProductOption;
  skuBase: string;
  assetSet: AssetSetState;
  uploadingRoles: Record<string, boolean>;
  mediaErrors: Record<string, string>;
  onChange: (patch: Partial<ProductOption>) => void;
  onUploadAsset: (file: File, key: AssetKey, role: MediaUploadRole) => Promise<void>;
  onUpdateAsset: (key: AssetKey, value: string) => void;
  onSetLandingPreview: (ready: boolean) => void;
}) {
  const mediaRequirements = getOptionMediaRequirements(option.optionCode, assetSet);
  const missingRequiredMedia = mediaRequirements.filter((requirement) => requirement.required && !requirement.value);
  const optionReady = !option.isActive || missingRequiredMedia.length === 0;
  const optionSku = `${skuBase || "PRODUCT"}-${optionSkuSuffix(option.optionCode)}`;
  const optionMeta = getOptionDisplayMeta(option);
  const optionPrice = option.monthlyPriceCents
    ? `${formatPrice(option.priceCents)} + ${formatPrice(option.monthlyPriceCents)}/mo`
    : formatPrice(option.priceCents);

  return (
    <details className="group rounded-md border border-line bg-white shadow-sm">
      <summary className="grid cursor-pointer list-none gap-3 p-3 md:grid-cols-[minmax(0,1fr)_140px_150px_120px] md:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-ink">{option.title}</h3>
            <AdminBadge tone="neutral">{optionMeta.badge}</AdminBadge>
            <OptionReadinessBadge ready={optionReady} missingCount={missingRequiredMedia.length} />
          </div>
          <p className="mt-1 text-xs leading-5 text-muted">{optionMeta.summary}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold text-muted">
            <code className="rounded bg-[#f7f8fa] px-2 py-1">{option.optionCode}</code>
            <code className="rounded bg-[#f7f8fa] px-2 py-1">{optionSku}</code>
          </div>
        </div>
        <div>
          <p className="text-[11px] font-black uppercase text-muted">Price</p>
          <p className="mt-1 text-sm font-black text-ink">{optionPrice}</p>
        </div>
        <div>
          <p className="text-[11px] font-black uppercase text-muted">Media</p>
          <p className={optionReady ? "mt-1 text-sm font-black text-brand" : "mt-1 text-sm font-black text-red-700"}>
            {optionReady ? "Ready" : missingRequiredMedia.map((item) => item.label).join(", ")}
          </p>
        </div>
        <label className="flex items-center justify-between gap-3 rounded-md border border-line px-3 py-2 text-sm font-bold text-ink" onClick={(event) => event.stopPropagation()}>
          Enabled
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-line accent-brand"
            checked={option.isActive}
            onChange={(event) => onChange({ isActive: event.target.checked })}
          />
        </label>
      </summary>

      <div className="grid gap-4 border-t border-line bg-[#fbfbfc] p-4">
        <div className="grid gap-3 md:grid-cols-3">
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

        {option.optionCode === "standard_direct" ? (
          <div className="rounded-md border border-line bg-white px-3 py-3 text-sm text-muted">
            <p className="font-bold text-ink">Standard Direct uses the main product image.</p>
            <p className="mt-1 text-xs leading-5">
              Upload or replace the first image in Product Media. Branded + QR uses separate branded media when that option is selected.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {mediaRequirements.map((requirement) => (
              <MediaUploadCard
                key={`${option.optionCode}-${requirement.assetKey}`}
                label={requirement.label}
                description={requirement.description}
                value={requirement.value}
                required={requirement.required && option.isActive}
                role={requirement.role}
                size="compact"
                isUploading={Boolean(uploadingRoles[requirement.role])}
                error={mediaErrors[requirement.role]}
                onUpload={(file) => onUploadAsset(file, requirement.assetKey, requirement.role)}
                onRemove={() => onUpdateAsset(requirement.assetKey, "")}
              />
            ))}
          </div>
        )}

        {option.optionCode === "hosted_multilink" ? (
          <label className="flex items-center justify-between gap-3 rounded-md border border-line bg-white p-3 text-sm font-bold text-ink">
            <span>
              Landing page preview configuration
              <span className="mt-1 block text-xs font-normal text-muted">Required before Hosted Multi-Link can be active.</span>
            </span>
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-line accent-brand"
              checked={assetSet.landingPagePreviewReady}
              onChange={(event) => {
                onSetLandingPreview(event.target.checked);
                onChange({ landingPageUrlPattern: event.target.checked ? option.landingPageUrlPattern ?? "/l/:client-name" : undefined });
              }}
            />
          </label>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <RulePill active={option.requiresDestinationUrl} label="Destination link" />
          <RulePill active={option.hasQr} label="Printed QR" />
          <RulePill active={option.requiresLogo} label="Logo" />
          <RulePill active={option.requiresBusinessName} label="Business name" />
          <RulePill active={option.requiresDesignStep} label="Design step" />
          <RulePill active={option.requiresFrontProof} label="Front proof" />
          <RulePill active={option.accountRequired} label="Account" />
          <RulePill active={option.requiresSubscription} label="Subscription" />
        </div>
      </div>
    </details>
  );
}

function ProductMediaTile({
  label,
  value,
  isMain = false,
  required = false,
  isSelected = false,
  isUploading,
  error,
  onToggleSelected,
  onUpload
}: {
  label: string;
  value: string;
  isMain?: boolean;
  required?: boolean;
  isSelected?: boolean;
  isUploading: boolean;
  error?: string;
  onToggleSelected: () => void;
  onUpload: (file: File) => void | Promise<void>;
}) {
  const ready = Boolean(value);

  function handleFile(file?: File) {
    if (file) {
      void onUpload(file);
    }
  }

  return (
    <div
      className={`group relative ${isMain ? "col-span-2 row-span-2" : ""} overflow-hidden rounded-lg border bg-white ${
        isSelected ? "border-brand ring-2 ring-brand/20" : "border-line"
      }`}
    >
      {ready ? (
        <button
          type="button"
          className="absolute left-2 top-2 z-10 grid h-6 w-6 place-items-center rounded-md border border-line bg-white/95 shadow-sm"
          aria-label={`${isSelected ? "Unselect" : "Select"} ${label}`}
          onClick={onToggleSelected}
        >
          <input className="pointer-events-none h-3.5 w-3.5 accent-brand" type="checkbox" checked={isSelected} readOnly />
        </button>
      ) : null}

      {ready ? (
        <details className="absolute right-2 top-2 z-10">
          <summary className="grid h-7 w-7 cursor-pointer list-none place-items-center rounded-md border border-line bg-white/95 text-muted shadow-sm hover:text-ink">
            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
          </summary>
          <div className="absolute right-0 z-20 mt-2 grid w-40 gap-1 rounded-md border border-line bg-white p-2 text-xs font-bold shadow-lg">
            <a className="inline-flex items-center gap-1 rounded px-2 py-1.5 text-ink hover:bg-[#f7f8fa]" href={value} target="_blank" rel="noreferrer">
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              View image
            </a>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded px-2 py-1.5 text-left text-ink hover:bg-[#f7f8fa]"
              onClick={() => {
                void navigator.clipboard?.writeText(value);
              }}
            >
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              Copy URL
            </button>
          </div>
        </details>
      ) : null}

      <label
        className={`grid h-full min-h-0 cursor-pointer place-items-center bg-[#fbfbfc] p-2 text-center ${ready ? "" : "border border-dashed border-transparent hover:border-brand"}`}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          handleFile(event.dataTransfer.files?.[0]);
        }}
      >
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          disabled={isUploading}
          onChange={(event) => handleFile(event.target.files?.[0])}
        />
        {ready ? (
          <img src={value} alt="" className="h-full max-h-full w-full object-contain" loading="lazy" />
        ) : (
          <span className="grid justify-items-center gap-2 px-2 text-xs font-bold text-muted">
            {isUploading ? <Loader2 className="h-5 w-5 animate-spin text-brand" aria-hidden="true" /> : <UploadCloud className="h-5 w-5 text-muted group-hover:text-brand" aria-hidden="true" />}
            <span>{isMain ? "Add main image" : "Add media"}</span>
            <span className="text-[11px] font-normal">PNG, JPG, WEBP</span>
          </span>
        )}
      </label>

      <div className="pointer-events-none absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2">
        <span className="rounded-full bg-white/95 px-2 py-1 text-[11px] font-black text-ink shadow-sm">{label}</span>
        <span className={ready ? "rounded-full bg-teal-50 px-2 py-1 text-[11px] font-black text-brand shadow-sm" : "rounded-full bg-white/95 px-2 py-1 text-[11px] font-black text-muted shadow-sm"}>
          {ready ? "Ready" : required ? "Missing" : "Optional"}
        </span>
      </div>
      {error ? <p className="absolute bottom-10 left-2 right-2 rounded-md border border-red-100 bg-red-50 px-2 py-1 text-[11px] font-bold text-red-700">{error}</p> : null}
      <input type="hidden" name={`product-media-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`} value={value} readOnly />
    </div>
  );
}

function MediaUploadCard({
  label,
  description,
  value,
  role,
  isUploading,
  error,
  required = false,
  size = "regular",
  secondaryAction,
  onUpload,
  onRemove
}: {
  label: string;
  description: string;
  value: string;
  role: MediaUploadRole;
  isUploading: boolean;
  error?: string;
  required?: boolean;
  size?: "hero" | "regular" | "thumbnail" | "compact";
  secondaryAction?: { label: string; onClick: () => void };
  onUpload: (file: File) => void | Promise<void>;
  onRemove: () => void;
}) {
  const ready = Boolean(value);
  const tileHeight = size === "hero" ? "h-52" : size === "thumbnail" ? "h-36" : size === "compact" ? "h-32" : "h-40";

  function handleFile(file?: File) {
    if (file) {
      void onUpload(file);
    }
  }

  return (
    <div className="grid gap-2 rounded-md border border-line bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-black text-ink">{label}</p>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <AdminBadge tone={ready ? "success" : required ? "danger" : "neutral"}>
            {ready ? "Ready" : required ? "Missing" : "Optional"}
          </AdminBadge>
          {ready ? (
            <details className="relative">
              <summary className="grid h-7 w-7 cursor-pointer list-none place-items-center rounded-md border border-line text-muted hover:text-ink">
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
              </summary>
              <div className="absolute right-0 z-20 mt-2 grid w-40 gap-1 rounded-md border border-line bg-white p-2 text-xs font-bold shadow-lg">
                {secondaryAction ? (
                  <button
                    type="button"
                    className="rounded px-2 py-1.5 text-left text-ink hover:bg-[#f7f8fa]"
                    onClick={secondaryAction.onClick}
                  >
                    {secondaryAction.label}
                  </button>
                ) : null}
                <a className="inline-flex items-center gap-1 rounded px-2 py-1.5 text-ink hover:bg-[#f7f8fa]" href={value} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  View image
                </a>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded px-2 py-1.5 text-left text-ink hover:bg-[#f7f8fa]"
                  onClick={() => {
                    void navigator.clipboard?.writeText(value);
                  }}
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  Copy URL
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded px-2 py-1.5 text-left text-red-700 hover:bg-red-50"
                  onClick={() => {
                    if (window.confirm(`Clear ${label}?`)) {
                      onRemove();
                    }
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Clear
                </button>
              </div>
            </details>
          ) : null}
        </div>
      </div>
      <label
        className={`group grid ${tileHeight} cursor-pointer place-items-center overflow-hidden rounded-md border border-dashed border-line bg-[#fbfbfc] p-2 text-center hover:border-brand`}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          handleFile(event.dataTransfer.files?.[0]);
        }}
      >
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          disabled={isUploading}
          onChange={(event) => handleFile(event.target.files?.[0])}
        />
        {ready ? (
          <img src={value} alt="" className="h-full max-h-full w-full object-contain" loading="lazy" />
        ) : (
          <span className="grid justify-items-center gap-2 text-xs font-bold text-muted">
            {isUploading ? <Loader2 className="h-5 w-5 animate-spin text-brand" aria-hidden="true" /> : <UploadCloud className="h-5 w-5 text-muted group-hover:text-brand" aria-hidden="true" />}
            Add image
            <span className="font-normal">PNG, JPG, WEBP up to 10 MB</span>
          </span>
        )}
      </label>
      {error ? <AdminAlert tone="danger">{error}</AdminAlert> : null}
      {isUploading && ready ? <p className="text-xs font-bold text-brand">Uploading replacement...</p> : null}
      <input type="hidden" name={`media-${role}`} value={value} readOnly />
    </div>
  );
}

function ControlledInput({
  name,
  label,
  value,
  placeholder,
  helper,
  required = true,
  onChange
}: {
  name: string;
  label: string;
  value: string;
  placeholder?: string;
  helper?: string;
  required?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink">
      {label}
      <AdminInput
        name={name}
        value={value}
        placeholder={placeholder}
        required={required}
        onChange={(event) => onChange(event.target.value)}
      />
      {helper ? <span className="text-xs font-semibold text-muted">{helper}</span> : null}
    </label>
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
    <label className="grid gap-2 text-sm font-semibold text-ink">
      {label}
      <AdminInput
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
    <label className="grid gap-2 text-sm font-semibold text-ink">
      {label}
      <AdminInput
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
  placeholder,
  tall = false,
  required = true,
  onChange
}: {
  name: string;
  label: string;
  defaultValue: string;
  placeholder?: string;
  tall?: boolean;
  required?: boolean;
  onChange?: ChangeEventHandler<HTMLTextAreaElement>;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink">
      {label}
      <AdminTextarea
        className={tall ? "min-h-36" : "min-h-20"}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        onChange={onChange}
      />
    </label>
  );
}

function StructuredPreview({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="grid gap-2">
      <p className="text-sm font-black text-ink">{title}</p>
      <div className="grid gap-2">
        {rows.length > 0 ? (
          rows.map(([label, value], index) => (
            <div key={`${title}-${index}`} className="grid gap-1 rounded-md border border-line bg-white px-3 py-2 text-sm md:grid-cols-[180px_1fr]">
              <span className="font-semibold text-ink">{label}</span>
              <span className="leading-6 text-muted">{value}</span>
            </div>
          ))
        ) : (
          <p className="rounded-md border border-line bg-white px-3 py-2 text-sm text-muted">No structured rows yet.</p>
        )}
      </div>
    </div>
  );
}

function VariantTextInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink">
      {label}
      <AdminInput value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function VariantNumberInput({
  label,
  value,
  step = "1",
  onChange
}: {
  label: string;
  value: number;
  step?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink">
      {label}
      <AdminInput
        min="0"
        step={step}
        type="number"
        value={String(value)}
        onChange={(event) => onChange(Number(event.target.value) || 0)}
      />
    </label>
  );
}

function VariantPriceInput({
  label,
  value,
  allowPending = true,
  onChange
}: {
  label: string;
  value: number | null;
  allowPending?: boolean;
  onChange: (value: number | null) => void;
}) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink">
      {label}
      <AdminInput
        inputMode="numeric"
        placeholder={allowPending ? "Pending" : "0"}
        value={value === null ? "" : String(value)}
        onChange={(event) => {
          const trimmed = event.target.value.trim();
          onChange(trimmed === "" && allowPending ? null : Math.max(0, Math.round(Number(trimmed) || 0)));
        }}
      />
    </label>
  );
}

function VariantBooleanSelect({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="grid gap-2 text-sm font-semibold text-ink">
      {label}
      <AdminSelect value={value ? "true" : "false"} onChange={(event) => onChange(event.target.value === "true")}>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </AdminSelect>
    </label>
  );
}

function createSizeOption(index: number): ProductSizeOption {
  return {
    code: `size-${index + 1}`,
    label: `Size ${index + 1}`,
    frontWidthMm: 1,
    frontHeightMm: 1,
    frontWidthIn: 0.01,
    frontHeightIn: 0.01,
    baseDepthMm: 1,
    baseDepthIn: 0.01,
    skuSuffix: `S${index + 1}`,
    priceAdjustmentCents: null,
    isDefault: index === 0,
    isActive: false
  };
}

function createColorOption(index: number): ProductColorOption {
  return {
    code: `color-${index + 1}`,
    label: `Color ${index + 1}`,
    skuSuffix: `C${index + 1}`,
    priceAdjustmentCents: 0,
    isDefault: index === 0,
    isActive: false
  };
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <AdminSoftPanel className="px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold text-ink">{value}</p>
    </AdminSoftPanel>
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
    <AdminBadge tone={active ? "success" : "neutral"}>
      {label}
    </AdminBadge>
  );
}

function OptionReadinessBadge({ ready, missingCount }: { ready: boolean; missingCount: number }) {
  return (
    <AdminBadge tone={ready ? "success" : "warning"}>
      {ready ? "Ready" : `${missingCount} media missing`}
    </AdminBadge>
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

function getOptionMediaRequirements(optionCode: ProductOptionCode, assetSet: AssetSetState) {
  if (optionCode === "hosted_multilink") {
    return [
      {
        label: "Multi-Link angled image",
        description: "Used for the hosted product card and product detail page.",
        assetKey: "multiLinkAngledImageUrl" as const,
        role: "multilink_angled" as const,
        value: assetSet.multiLinkAngledImageUrl,
        required: true
      },
      {
        label: "Multi-Link front template",
        description: "Used for the branded front proof and hosted stand template.",
        assetKey: "multiLinkFrontTemplateUrl" as const,
        role: "multilink_front_template" as const,
        value: assetSet.multiLinkFrontTemplateUrl,
        required: true
      }
    ];
  }

  if (optionCode === "branded_qr_direct") {
    return [
      {
        label: "Branded + QR angled image",
        description: "Optional storefront preview for the branded stand option.",
        assetKey: "brandedAngledImageUrl" as const,
        role: "branded_angled" as const,
        value: assetSet.brandedAngledImageUrl,
        required: false
      },
      {
        label: "Branded front template",
        description: "Print/proof template with logo, business-name, and QR zones.",
        assetKey: "brandedFrontTemplateUrl" as const,
        role: "branded_front_template" as const,
        value: assetSet.brandedFrontTemplateUrl,
        required: true
      },
      {
        label: "Center platform/icon asset",
        description: "Optional legacy asset. Google branded production does not require a separate center asset.",
        assetKey: "centerAssetUrl" as const,
        role: "center_asset" as const,
        value: assetSet.centerAssetUrl,
        required: false
      }
    ];
  }

  return [
    {
      label: "Standard Direct angled image",
      description: "Ready-made NFC stand image for Standard Direct.",
      assetKey: "standardAngledImageUrl" as const,
      role: "standard_angled" as const,
      value: assetSet.standardAngledImageUrl,
      required: true
    },
    {
      label: "Standard front template",
      description: "Optional locked front reference for standard stands.",
      assetKey: "standardFrontTemplateUrl" as const,
      role: "standard_front" as const,
      value: assetSet.standardFrontTemplateUrl,
      required: false
    }
  ];
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

function cleanAssetSet(assetSet: AssetSetState, mainImageSrc?: string) {
  return {
    standardAngledImageUrl: readOptionalString(assetSet.standardAngledImageUrl) ?? readOptionalString(mainImageSrc),
    brandedAngledImageUrl: readOptionalString(assetSet.brandedAngledImageUrl),
    multiLinkAngledImageUrl: readOptionalString(assetSet.multiLinkAngledImageUrl),
    standardFrontTemplateUrl: readOptionalString(assetSet.standardFrontTemplateUrl),
    brandedFrontTemplateUrl: readOptionalString(assetSet.brandedFrontTemplateUrl),
    multiLinkFrontTemplateUrl: readOptionalString(assetSet.multiLinkFrontTemplateUrl),
    centerAssetUrl: readOptionalString(assetSet.centerAssetUrl),
    landingPagePreviewConfig: assetSet.landingPagePreviewReady ? { ready: true } : undefined
  };
}

function collectImagesFromMedia(
  mainImage: MediaItemState,
  galleryImages: MediaItemState[],
  assetSet: AssetSetState,
  title: string
): MigratedProduct["images"] {
  const sources = [
    mainImage.src,
    ...galleryImages.map((image) => image.src),
    assetSet.standardAngledImageUrl,
    assetSet.brandedAngledImageUrl,
    assetSet.multiLinkAngledImageUrl,
    assetSet.standardFrontTemplateUrl,
    assetSet.brandedFrontTemplateUrl,
    assetSet.multiLinkFrontTemplateUrl
  ];
  const seen = new Set<string>();

  return sources
    .map(readOptionalString)
    .filter((source): source is string => {
      if (!source || seen.has(source)) return false;
      seen.add(source);
      return true;
    })
    .map((src) => ({ src, alt: title }));
}

function getAdminMediaWarnings(slug: string, mainImage: MediaItemState, galleryImages: MediaItemState[], assetSet: AssetSetState) {
  const warnings = new Set<string>();
  const standardImage = readOptionalString(assetSet.standardAngledImageUrl) ?? readOptionalString(mainImage.src) ?? "";
  const brandedImage = readOptionalString(assetSet.brandedAngledImageUrl) ?? "";
  const brandedTemplate = readOptionalString(assetSet.brandedFrontTemplateUrl) ?? "";
  const mediaText = [mainImage, ...galleryImages]
    .map((image) => `${image.src} ${image.alt}`)
    .join(" ")
    .toLowerCase();

  if (mainImage.src.includes("no-photo-available")) {
    warnings.add("Placeholder main image is still in use.");
  }

  if (mainImage.src.includes("/draft-product/")) {
    warnings.add("Main image still uses a draft product media path.");
  }

  if (brandedImage && standardImage && brandedImage === standardImage) {
    warnings.add("Branded angled image currently matches the Standard Direct image.");
  }

  if (brandedTemplate.includes("/products/") && !brandedTemplate.includes(`/products/${slug}/`)) {
    warnings.add("Branded front template appears to be reused from another product.");
  }

  if (mediaText.includes("temporary")) {
    warnings.add("One or more media items are labeled temporary.");
  }

  return Array.from(warnings);
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
    "dealerrater",
    "autotrader",
    "carfax",
    "edmunds",
    "cars",
    "cargurus",
    "repairpal",
    "surecritic",
    "homeadvisor",
    "thumbtack",
    "houzz",
    "porch",
    "instagram",
    "tiktok",
    "linkedin",
    "x",
    "youtube",
    "snapchat",
    "pinterest",
    "airbnb",
    "agoda",
    "vrbo",
    "hotels",
    "healthgrades",
    "vitals",
    "ratemds",
    "caredash",
    "opencare",
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
    "angi",
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

function generateProductSku(title: string) {
  const normalized = title.toLowerCase();
  if (normalized.includes("google") && normalized.includes("review") && normalized.includes("stand")) {
    return "TR-GOOGLE-REV-ST";
  }

  const cleaned = normalized
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toUpperCase();
  return formatSku(`TR-${cleaned || "PRODUCT"}`);
}

function getOptionDisplayMeta(option: ProductOption) {
  const map: Record<ProductOptionCode, { badge: string; summary: string }> = {
    standard_direct: {
      badge: "STD / NFC",
      summary: "Standard Direct uses the ready-made angled stand image with NFC pointed to one direct URL."
    },
    branded_qr_direct: {
      badge: "BQR / NFC + QR",
      summary: "Branded + QR uses its own angled image plus a front template with logo, business-name, and QR zones."
    },
    hosted_multilink: {
      badge: "HML / hosted page",
      summary: "Hosted Multi-Link uses branded stand media, a hosted Tap Rater page, and monthly service."
    }
  };

  return map[option.optionCode];
}

function optionSkuSuffix(optionCode: ProductOptionCode) {
  const map: Record<ProductOptionCode, string> = {
    standard_direct: "STD",
    branded_qr_direct: "BRD",
    hosted_multilink: "HML"
  };

  return map[optionCode];
}

function formatSku(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
}

function parseMultiline(value: string) {
  return Array.from(new Set(value.split(/\r?\n|\|/).map((item) => item.trim()).filter(Boolean)));
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
