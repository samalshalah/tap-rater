"use client";

import type { ProductColorOption, ProductSizeOption } from "@/data/migrated-products";
import type { ProductOption, ProductOptionCode } from "@/lib/catalog-architecture";
import { getProductAssetReadiness, inferProductKind } from "@/lib/catalog-architecture";
import { generateProductSeo } from "@/lib/product-seo";
import { type FormEvent, useMemo, useState } from "react";
import { buildInitialOptions, categorySlugForStandType, cleanAssetSet, collectImagesFromMedia, formatOptionPricing, formatSku, generateProductSku, getAdminMediaWarnings, getOptionMediaRequirements, getOrganizationIssues, getSupportedDestinations, normalizeOperationalProductKind, parseMultiline, readOptionalString, readRequiredText, selectedPlatformDestinationType, slugify } from "./product-editor-model";
import type { AssetKey, AssetSetState, MediaItemState, MediaUploadRole, OperationalProductKind, ProductEditorProps, SaveStatus } from "./product-editor-types";
import { normalOptionCodes } from "./product-editor-types";

export function useProductEditor({
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

  const [sizeOptions, setSizeOptions] = useState<ProductSizeOption[]>(() => product.sizeOptions ?? []);

  const [colorOptions, setColorOptions] = useState<ProductColorOption[]>(() => product.colorOptions ?? []);

  const [specifications, setSpecifications] = useState(() => product.specifications ?? []);

  const [includedItems, setIncludedItems] = useState(() => product.includedItems ?? []);

  const visibleOptions = useMemo(
    () => optionStates.filter((option) => normalOptionCodes.includes(option.optionCode)),
    [optionStates]
  );

  const activeVisibleOptions = useMemo(() => visibleOptions.filter((option) => option.isActive), [visibleOptions]);

  const effectiveAssetSet = useMemo(
    () => ({
      ...assetSet,
      standardAngledImageUrl: assetSet.standardAngledImageUrl || mainImage.src
    }),
    [assetSet, mainImage.src]
  );

  const readiness = useMemo(() => getProductAssetReadiness(
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
  ), [productKind, isSpecialSolution, effectiveAssetSet, activeVisibleOptions]);

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

  const mediaWarnings = useMemo(() => getAdminMediaWarnings(slug || product.slug, mainImage, galleryImages, effectiveAssetSet), [slug, product.slug, mainImage, galleryImages, effectiveAssetSet]);

  const optionReadinessRows = useMemo(() => activeVisibleOptions.flatMap((option) =>
    getOptionMediaRequirements(option.optionCode, effectiveAssetSet)
      .filter((requirement) => requirement.required)
      .map((requirement) => ({
        optionTitle: option.title,
        label: requirement.label,
        ready: Boolean(requirement.value)
      }))
  ), [activeVisibleOptions, effectiveAssetSet]);

  const missingOptionMedia = useMemo(() => optionReadinessRows.filter((row) => !row.ready), [optionReadinessRows]);

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
          searchKeywords: parseMultiline(String(form.get("searchTerms") ?? "")),
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

  return {
    status,
    isSaving,
    title,
    slug,
    slugEdited,
    sku,
    skuEdited,
    productKind,
    sortOrder,
    setSortOrder,
    standTypeSlug,
    setStandTypeSlug,
    primaryPlatformSlug,
    setPrimaryPlatformSlug,
    destinationType,
    setDestinationType,
    businessUseSlugs,
    isSpecialSolution,
    setIsSpecialSolution,
    supportsMultiLink,
    setSupportsMultiLink,
    publishStatus,
    setPublishStatus,
    assetSet,
    mainImage,
    setMainImage,
    galleryImages,
    setGalleryImages,
    uploadingRoles,
    mediaErrors,
    sizeOptions,
    setSizeOptions,
    colorOptions,
    setColorOptions,
    specifications,
    setSpecifications,
    includedItems,
    setIncludedItems,
    visibleOptions,
    activeVisibleOptions,
    effectiveAssetSet,
    activationIssues,
    canActivate,
    primaryPlatform,
    pricingSummary,
    basePriceCents,
    seoPreview,
    productMediaReady,
    mediaWarnings,
    optionReadinessRows,
    missingOptionMedia,
    brandedProductionTemplateMissing,
    updateAsset,
    updateTitle,
    updateSlug,
    updateSku,
    uploadMainImage,
    uploadGalleryImage,
    uploadAssetImage,
    updateOption,
    updateProductKind,
    toggleBusinessUse,
    submit
  };
}
