import type {MigratedProduct} from '@/data/migrated-products';
import {productDisplayNames} from '@/data/product-display-names';
import {getCategoryBySlug,getProductBySlug} from '@/lib/products';
import {sanitizePublicStorefrontProduct} from './product-public-copy';
import {readString,readNumber,readBoolean,readStockStatus,readServiceMode,readProductType,readCheckoutMode,readSupportedDestinations,readActivationType,readProductFormat,readProductKind,categorySlugForStandType,readProductStatus,readAssetReadinessStatus,readCustomizationOptions,readDesignMode,inferProductFormatFromTitle,readStringArray,readArray,readRecord,readImages,readVariants} from './product-row-readers';
type ProductRow=Record<string,unknown>;

export function normalizeStorefrontProductRow(row: unknown, options: { sanitizePublicCopy?: boolean } = {}): MigratedProduct | null {
  if (!row || typeof row !== "object") {
    return null;
  }

  const productRow = row as ProductRow;
  const slug = readString(productRow.slug);
  const staticProduct = slug ? getProductBySlug(slug) : undefined;
  const title = (slug ? productDisplayNames[slug] : undefined) ?? readString(productRow.title) ?? staticProduct?.title;
  const sku = readString(productRow.sku) ?? staticProduct?.sku ?? slug?.toUpperCase().replace(/[^A-Z0-9]+/g, "-");
  const rawCategorySlug =
    readString(productRow.category_slug) ??
    readString(productRow.categorySlug) ??
    readString(productRow.stand_category_slug) ??
    readString(productRow.standCategorySlug) ??
    staticProduct?.categorySlug;
  const standTypeSlug = readString(productRow.stand_type_slug) ?? readString(productRow.standTypeSlug) ?? staticProduct?.standTypeSlug;
  const primaryPlatformSlug =
    readString(productRow.primary_platform_slug) ?? readString(productRow.primaryPlatformSlug) ?? staticProduct?.primaryPlatformSlug;
  const destinationType = readString(productRow.destination_type) ?? readString(productRow.destinationType) ?? staticProduct?.destinationType;
  const businessUseSlugs =
    readStringArray(productRow.business_use_slugs) ?? readStringArray(productRow.businessUseSlugs) ?? staticProduct?.businessUseSlugs;
  const isSpecialSolution =
    readBoolean(productRow.is_special_solution) ?? readBoolean(productRow.isSpecialSolution) ?? staticProduct?.isSpecialSolution ?? false;
  const productKind = readProductKind(productRow.product_kind) ?? readProductKind(productRow.productKind) ?? staticProduct?.productKind;
  const status = readProductStatus(productRow.status) ?? staticProduct?.status;
  const sortOrder = readNumber(productRow.sort_order) ?? readNumber(productRow.sortOrder) ?? staticProduct?.sortOrder ?? 1000;
  const matchedCategory = rawCategorySlug ? getCategoryBySlug(rawCategorySlug) : undefined;
  const categorySlug = categorySlugForStandType(standTypeSlug) ?? categorySlugForStandType(rawCategorySlug) ?? matchedCategory?.slug ?? staticProduct?.categorySlug ?? rawCategorySlug;
  const basePriceCents = readNumber(productRow.base_price_cents) ?? readNumber(productRow.basePriceCents) ?? staticProduct?.basePriceCents ?? 3900;
  const stockStatus = readStockStatus(productRow.stock_status) ?? readStockStatus(productRow.stockStatus) ?? staticProduct?.stockStatus ?? "instock";
  const shortDescription =
    readString(productRow.short_description) ?? readString(productRow.shortDescription) ?? staticProduct?.shortDescription ?? `${title} NFC stand.`;
  const description = readString(productRow.description) ?? staticProduct?.description ?? shortDescription;
  const productType =
    readProductType(productRow.product_type) ?? readProductType(productRow.productType) ?? staticProduct?.productType ?? "physical_redirect";
  const serviceMode = readServiceMode(productRow.service_mode) ?? readServiceMode(productRow.serviceMode) ?? staticProduct?.serviceMode ?? "basic_redirect";
  const checkoutMode = readCheckoutMode(productRow.checkout_mode) ?? readCheckoutMode(productRow.checkoutMode) ?? staticProduct?.checkoutMode ?? "buy_now";
  const requiresAccount =
    readBoolean(productRow.requires_account) ?? readBoolean(productRow.requiresAccount) ?? staticProduct?.requiresAccount ?? false;
  const requiresSubscription =
    readBoolean(productRow.requires_subscription) ?? readBoolean(productRow.requiresSubscription) ?? staticProduct?.requiresSubscription ?? false;
  const requiresLandingPage =
    readBoolean(productRow.requires_landing_page) ?? readBoolean(productRow.requiresLandingPage) ?? staticProduct?.requiresLandingPage ?? false;
  const supportsMultiLink =
    readBoolean(productRow.supports_multilink) ?? readBoolean(productRow.supportsMultiLink) ?? staticProduct?.supportsMultiLink ?? false;
  const supportedDestinations =
    readSupportedDestinations(productRow.supported_destinations) ??
    readSupportedDestinations(productRow.supportedDestinations) ??
    staticProduct?.supportedDestinations ??
    ["custom"];
  const activationType =
    readActivationType(productRow.activation_type) ?? readActivationType(productRow.activationType) ?? staticProduct?.activationType ?? "free_basic_activation";
  const includedServiceLabel =
    readString(productRow.included_service_label) ?? readString(productRow.includedServiceLabel) ?? staticProduct?.includedServiceLabel ?? "Free basic activation";
  const format =
    readProductFormat(productRow.format) ??
    readProductFormat(productRow.product_format) ??
    staticProduct?.format ??
    inferProductFormatFromTitle(title);
  const customizationOptions =
    readCustomizationOptions(productRow.customization_options) ??
    readCustomizationOptions(productRow.customizationOptions) ??
    staticProduct?.customizationOptions ??
    ["standard_design"];
  const allowsLogoUpload =
    readBoolean(productRow.allows_logo_upload) ??
    readBoolean(productRow.allowsLogoUpload) ??
    staticProduct?.allowsLogoUpload ??
    customizationOptions.includes("add_logo");
  const allowsCustomDesign =
    readBoolean(productRow.allows_custom_design) ??
    readBoolean(productRow.allowsCustomDesign) ??
    staticProduct?.allowsCustomDesign ??
    customizationOptions.includes("custom_design");
  const designMode = readDesignMode(productRow.design_mode) ?? readDesignMode(productRow.designMode) ?? staticProduct?.designMode ?? "standard";
  const displayText = readString(productRow.display_text) ?? readString(productRow.displayText) ?? staticProduct?.displayText;
  const assetSet = {
    standardAngledImageUrl:
      readString(productRow.standard_angled_image_url) ?? readString(productRow.standardAngledImageUrl) ?? staticProduct?.assetSet?.standardAngledImageUrl,
    brandedAngledImageUrl:
      readString(productRow.branded_angled_image_url) ?? readString(productRow.brandedAngledImageUrl) ?? staticProduct?.assetSet?.brandedAngledImageUrl,
    multiLinkAngledImageUrl:
      readString(productRow.multilink_angled_image_url) ??
      readString(productRow.multiLinkAngledImageUrl) ??
      staticProduct?.assetSet?.multiLinkAngledImageUrl,
    standardFrontTemplateUrl:
      readString(productRow.standard_front_template_url) ?? readString(productRow.standardFrontTemplateUrl) ?? staticProduct?.assetSet?.standardFrontTemplateUrl,
    brandedFrontTemplateUrl:
      readString(productRow.branded_front_template_url) ?? readString(productRow.brandedFrontTemplateUrl) ?? staticProduct?.assetSet?.brandedFrontTemplateUrl,
    multiLinkFrontTemplateUrl:
      readString(productRow.multilink_front_template_url) ??
      readString(productRow.multiLinkFrontTemplateUrl) ??
      staticProduct?.assetSet?.multiLinkFrontTemplateUrl,
    centerAssetUrl: readString(productRow.center_asset_url) ?? readString(productRow.centerAssetUrl) ?? staticProduct?.assetSet?.centerAssetUrl,
    landingPagePreviewConfig:
      readRecord(productRow.landing_page_preview_config) ??
      readRecord(productRow.landingPagePreviewConfig) ??
      staticProduct?.assetSet?.landingPagePreviewConfig
  };
  const defaultCtaText = readString(productRow.default_cta_text) ?? readString(productRow.defaultCtaText) ?? staticProduct?.defaultCtaText;
  const ctaEditable = readBoolean(productRow.cta_editable) ?? readBoolean(productRow.ctaEditable) ?? staticProduct?.ctaEditable;
  const assetReadinessStatus =
    readAssetReadinessStatus(productRow.asset_readiness_status) ??
    readAssetReadinessStatus(productRow.assetReadinessStatus) ??
    staticProduct?.assetReadinessStatus;

  if (
    !slug ||
    !title ||
    !sku ||
    !categorySlug ||
    basePriceCents === undefined ||
    !stockStatus ||
    !shortDescription ||
    !description ||
    !format ||
    customizationOptions.length === 0 ||
    !designMode
  ) {
    return null;
  }

  const product = {
    slug,
    title,
    sku,
    categorySlug: categorySlug as MigratedProduct["categorySlug"],
    standTypeSlug,
    primaryPlatformSlug,
    destinationType,
    businessUseSlugs,
    isSpecialSolution,
    productKind,
    status,
    sortOrder,
    basePriceCents,
    salePriceCents: readNumber(productRow.sale_price_cents) ?? readNumber(productRow.salePriceCents),
    stockStatus,
    shortDescription,
    description,
    productType,
    serviceMode,
    checkoutMode,
    requiresAccount,
    requiresSubscription,
    requiresLandingPage,
    supportsMultiLink,
    supportedDestinations,
    activationType,
    includedServiceLabel,
    format,
    customizationOptions,
    allowsLogoUpload,
    allowsCustomDesign,
    designMode,
    displayText,
    assetSet,
    defaultCtaText,
    ctaEditable,
    assetReadinessStatus,
    images: readImages(productRow.images) ?? staticProduct?.images ?? [],
    variants: readVariants(productRow.variants) ?? staticProduct?.variants ?? [],
    isActive: readBoolean(productRow.is_active) ?? readBoolean(productRow.isActive) ?? true,
    seoTitle: (slug ? productDisplayNames[slug]?.replace(/^Tap Rater /, "") : undefined) ?? readString(productRow.seo_title) ?? readString(productRow.seoTitle) ?? staticProduct?.seoTitle,
    seoDescription: readString(productRow.seo_description) ?? readString(productRow.seoDescription) ?? staticProduct?.seoDescription,
    searchKeywords:
      readStringArray(productRow.search_keywords) ?? readStringArray(productRow.searchKeywords),
    sizeOptions: readArray<NonNullable<MigratedProduct["sizeOptions"]>[number]>(productRow.size_options) ?? readArray<NonNullable<MigratedProduct["sizeOptions"]>[number]>(productRow.sizeOptions),
    colorOptions: readArray<NonNullable<MigratedProduct["colorOptions"]>[number]>(productRow.color_options) ?? readArray<NonNullable<MigratedProduct["colorOptions"]>[number]>(productRow.colorOptions),
    keyFeatures: readArray<NonNullable<MigratedProduct["keyFeatures"]>[number]>(productRow.key_features) ?? readArray<NonNullable<MigratedProduct["keyFeatures"]>[number]>(productRow.keyFeatures),
    howItWorks: readArray<NonNullable<MigratedProduct["howItWorks"]>[number]>(productRow.how_it_works) ?? readArray<NonNullable<MigratedProduct["howItWorks"]>[number]>(productRow.howItWorks),
    specifications: readArray<NonNullable<MigratedProduct["specifications"]>[number]>(productRow.specifications),
    includedItems: readArray<NonNullable<MigratedProduct["includedItems"]>[number]>(productRow.included_items) ?? readArray<NonNullable<MigratedProduct["includedItems"]>[number]>(productRow.includedItems),
    productFaqs: readArray<NonNullable<MigratedProduct["productFaqs"]>[number]>(productRow.product_faqs) ?? readArray<NonNullable<MigratedProduct["productFaqs"]>[number]>(productRow.productFaqs),
    updatedAt: readString(productRow.updated_at) ?? readString(productRow.updatedAt) ?? staticProduct?.updatedAt
  };

  return options.sanitizePublicCopy === false ? product : sanitizePublicStorefrontProduct(product);
}
