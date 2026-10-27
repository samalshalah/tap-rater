"use client";

import type { ProductColorOption,ProductSizeOption } from "@/data/migrated-products";
import type {
ProductOption,
ProductOptionCode
} from "@/lib/catalog-architecture";
import { getProductAssetReadiness,inferProductKind } from "@/lib/catalog-architecture";
import { generateProductSeo } from "@/lib/product-seo";
import { formatPrice } from "@/lib/products";
import { hostedMultiLinkServiceAddon } from "@/lib/service-addons";
import { CheckCircle2,ExternalLink,Save } from "lucide-react";
import { type FormEvent,useMemo,useState } from "react";
import { AdminAlert,AdminBadge,AdminButton,AdminExternalButton,AdminInput,AdminLinkButton,AdminSelect,AdminSoftPanel } from "./admin-ui";
import { ProductPhysicalDetailsEditor } from "./product-physical-details-editor";

import { ControlledInput,EditorCard,InfoPill,Input,ReadinessLine,RuleRow,SidebarCard,StructuredPreview,Textarea,VariantBooleanSelect,VariantNumberInput,VariantPriceInput,VariantTextInput } from "./product-editor-fields";
import { ProductMediaGrid,SetupOptionEditor } from "./product-editor-media";
import { buildInitialOptions,categorySlugForStandType,cleanAssetSet,collectImagesFromMedia,createColorOption,createSizeOption,formatOptionPricing,formatSku,generateProductSku,getAdminMediaWarnings,getOptionMediaRequirements,getOrganizationIssues,getSupportedDestinations,normalizeOperationalProductKind,parseMultiline,readOptionalString,readRequiredText,selectedPlatformDestinationType,slugify } from "./product-editor-model";
import type { AssetKey,AssetSetState,MediaItemState,MediaUploadRole,OperationalProductKind,ProductEditorProps,SaveStatus } from "./product-editor-types";
import { normalOptionCodes } from "./product-editor-types";
export function ProductEditor({
  product,
  standTypes,
  businessUses,
  platforms,
  optionTemplates,
  productOptions,
  mode
}: ProductEditorProps) {
  const initialKind = normalizeOperationalProductKind(product.productKind ?? inferProductKind(product));
  const [status, setStatus] = useState<SaveStatus>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [title, setTitle] = useState(product.title);
  const [slug, setSlug] = useState(product.slug);
  const [slugEdited, setSlugEdited] = useState(mode === "edit" && Boolean(product.slug));
  const [sku, setSku] = useState(product.sku || generateProductSku(product.title));
  const [skuEdited, setSkuEdited] = useState(mode === "edit" && Boolean(product.sku));
  const [productKind, setProductKind] = useState<OperationalProductKind>(initialKind);
  const [sortOrder, setSortOrder] = useState(product.sortOrder ?? 1000);
  const [standTypeSlug, setStandTypeSlug] = useState(product.standTypeSlug ?? standTypes[0]?.slug ?? "");
  const [primaryPlatformSlug, setPrimaryPlatformSlug] = useState(product.primaryPlatformSlug ?? "custom-url");
  const [destinationType, setDestinationType] = useState(product.destinationType ?? selectedPlatformDestinationType(platforms, primaryPlatformSlug));
  const [businessUseSlugs, setBusinessUseSlugs] = useState<string[]>(product.businessUseSlugs ?? []);
  const [isSpecialSolution, setIsSpecialSolution] = useState(product.isSpecialSolution ?? false);
  const [supportsMultiLink, setSupportsMultiLink] = useState(product.supportsMultiLink ?? false);
  const [publishStatus, setPublishStatus] = useState(product.status ?? (product.isActive ? "active" : "draft"));
  const [assetSet, setAssetSet] = useState<AssetSetState>(() => ({
    standardAngledImageUrl: product.assetSet?.standardAngledImageUrl ?? product.images[0]?.src ?? "",
    brandedAngledImageUrl: product.assetSet?.brandedAngledImageUrl ?? product.images[1]?.src ?? product.assetSet?.standardAngledImageUrl ?? "",
    standardFrontTemplateUrl: product.assetSet?.standardFrontTemplateUrl ?? "",
    brandedFrontTemplateUrl: product.assetSet?.brandedFrontTemplateUrl ?? ""
  }));
  const [mainImage, setMainImage] = useState<MediaItemState>(() => product.images[0] ?? { src: product.assetSet?.standardAngledImageUrl ?? "", alt: product.title });
  const [galleryImages, setGalleryImages] = useState<MediaItemState[]>(() => product.images.slice(1, 5));
  const [uploadingRoles, setUploadingRoles] = useState<Record<string, boolean>>({});
  const [mediaErrors, setMediaErrors] = useState<Record<string, string>>({});
  const [optionStates, setOptionStates] = useState<ProductOption[]>(() =>
    buildInitialOptions(productKind, productOptions, optionTemplates, mode)
  );
  const [searchTermsText, setSearchTermsText] = useState((product.searchKeywords ?? []).join("\n"));
  const [sizeOptions, setSizeOptions] = useState<ProductSizeOption[]>(() => product.sizeOptions ?? []);
  const [colorOptions, setColorOptions] = useState<ProductColorOption[]>(() => product.colorOptions ?? []);
  const [specifications, setSpecifications] = useState(() => product.specifications ?? []);
  const [includedItems, setIncludedItems] = useState(() => product.includedItems ?? []);

  const visibleOptions = useMemo(
    () => optionStates.filter((option) => normalOptionCodes.includes(option.optionCode)),
    [optionStates]
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
        standardFrontTemplateUrl: readOptionalString(effectiveAssetSet.standardFrontTemplateUrl),
        brandedFrontTemplateUrl: readOptionalString(effectiveAssetSet.brandedFrontTemplateUrl),
        multiLinkAngledImageUrl: undefined,
        multiLinkFrontTemplateUrl: undefined,
        centerAssetUrl: undefined,
        landingPagePreviewConfig: undefined
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
        isSpecialSolution,
        productKind,
        supportsMultiLink,
        basePriceCents,
        salePriceCents: undefined,
        requiresAccount: false,
        requiresSubscription: false,
        requiresLandingPage: false,
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
      supportsMultiLink,
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

  function updateProductKind(nextProductKind: OperationalProductKind) {
    setProductKind(nextProductKind);
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
    const finalSortOrder = Math.max(0, Math.min(100000, Math.round(sortOrder || 1000)));
    const finalOptions = visibleOptions.map((option) => ({ ...option, priceCents: Math.max(0, Math.round(option.priceCents)) }));
    const finalActiveOptions = finalOptions.filter((option) => option.isActive);
    const basePriceCents = finalActiveOptions.length > 0 ? Math.min(...finalActiveOptions.map((option) => option.priceCents)) : 3900;
    const supportedDestinations = getSupportedDestinations(primaryPlatformSlug);
    const shortDescription = readOptionalString(String(form.get("shortDescription") ?? "")) ?? `${finalTitle} NFC stand.`;
    const description = readOptionalString(String(form.get("description") ?? "")) ?? shortDescription;

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
          isSpecialSolution,
          productKind,
          status: finalStatus,
          sortOrder: finalSortOrder,
          basePriceCents,
          salePriceCents: undefined,
          stockStatus: form.get("stockStatus"),
          shortDescription,
          description,
          productType: "physical_redirect",
          serviceMode: "basic_redirect",
          checkoutMode: "buy_now",
          requiresAccount: false,
          requiresSubscription: false,
          requiresLandingPage: false,
          supportsMultiLink,
          supportedDestinations,
          activationType: "free_basic_activation",
          includedServiceLabel: "Free basic activation",
          format: "stand",
          customizationOptions: ["standard_design", "add_logo"],
          allowsLogoUpload: finalActiveOptions.some((option) => option.requiresLogo),
          allowsCustomDesign: false,
          designMode: finalActiveOptions.some((option) => option.requiresLogo) ? "logo" : "standard",
          assetSet: cleanAssetSet(assetSet, mainImage.src),
          defaultCtaText: undefined,
          ctaEditable: false,
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
          specifications: specifications.map((item) => ({ ...item, label: item.label.trim(), value: item.value.trim() })),
          includedItems: includedItems.map((item) => ({ ...item, label: item.label.trim() })),
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
            <label className="grid gap-2 text-sm font-semibold text-ink">
              Product sort number
              <AdminInput
                type="number"
                min={0}
                max={100000}
                step={1}
                value={sortOrder}
                onChange={(event) => setSortOrder(Number(event.target.value))}
              />
              <span className="text-xs font-semibold leading-5 text-muted">Lower numbers show first. Use 10, 20, 30 to leave space.</span>
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

        <EditorCard title="Production Rules" description="Current storefront rules for each customer setup option.">
          <div className="grid gap-2 text-sm text-muted">
            <RuleRow label="Standard Direct" value="NFC direct. No logo zone, business name zone, QR zone, or design step." />
            <RuleRow label="Branded + QR" value="Logo zone, business name zone, QR zone, and artwork review required." />
            <RuleRow label="Multi-Link add-on" value="Optional hosted page capability controlled in Services & Add-ons. It is not an operational product type." />
          </div>
        </EditorCard>

        <EditorCard title="Services & Add-ons" description="Controls optional service capabilities available for this physical product.">
          <label className="flex items-start gap-4 rounded-lg border border-brand/40 bg-brand/5 p-4 text-sm text-ink">
            <input
              type="checkbox"
              className="mt-1 h-5 w-5 accent-brand"
              checked={supportsMultiLink}
              onChange={(event) => setSupportsMultiLink(event.target.checked)}
            />
            <span className="grid gap-2">
              <span className="text-base font-black">Supports Multi-Link</span>
              <span className="leading-6 text-muted">
                When enabled, this product shows the Direct / Multi-Link link experience selector on the product page and appears on /multi-link.
              </span>
              <span className="text-xs font-bold uppercase tracking-[0.04em] text-brand">
                {hostedMultiLinkServiceAddon.maxLinks} editable links
              </span>
            </span>
          </label>
          <InfoPill label="Fixed Multi-Link plan (read-only)" value={`${formatPrice(hostedMultiLinkServiceAddon.monthlyPriceCents)}/month`} />
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
          <ProductPhysicalDetailsEditor specifications={specifications} includedItems={includedItems}
            onSpecificationsChange={setSpecifications} onIncludedItemsChange={setIncludedItems} />
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
              onChange={(event) => updateProductKind(event.target.value as OperationalProductKind)}
            >
              <option value="normal_direct">Direct stand</option>
              <option value="custom_direct">Custom stand product</option>
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
            <li>Branded + QR requires logo collection, business name, QR generation, artwork review, and a branded front template before publishing.</li>
            <li>Multi-Link is an add-on capability. Enable it in Services & Add-ons for compatible physical products.</li>
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
