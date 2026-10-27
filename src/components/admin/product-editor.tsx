"use client";

import { ProductVariantEditor } from "./product-variant-editor";
import { formatPrice } from "@/lib/products";
import { hostedMultiLinkServiceAddon } from "@/lib/service-addons";
import { CheckCircle2, ExternalLink, Save } from "lucide-react";
import { AdminAlert, AdminButton, AdminExternalButton, AdminInput, AdminLinkButton, AdminSelect, AdminSoftPanel } from "./admin-ui";
import { ControlledInput, EditorCard, InfoPill, RuleRow, SidebarCard, Textarea } from "./product-editor-fields";
import { ProductMediaGrid, SetupOptionEditor } from "./product-editor-media";
import { generateProductSku, selectedPlatformDestinationType } from "./product-editor-model";
import type { OperationalProductKind, ProductEditorProps } from "./product-editor-types";
import { ProductSeoEditor } from "./product-seo-editor";
import { ProductDetailsEditor } from "./product-details-editor";
import { ProductReadinessPanel } from "./product-readiness-panel";
import { useProductEditor } from "./use-product-editor";

export function ProductEditor({
  product,
  standTypes,
  businessUses,
  platforms,
  optionTemplates,
  productOptions,
  mode
}: ProductEditorProps) {
  const {
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
  } = useProductEditor({ product, standTypes, businessUses, platforms, optionTemplates, productOptions, mode });

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

        <ProductVariantEditor sizeOptions={sizeOptions} colorOptions={colorOptions} setSizeOptions={setSizeOptions} setColorOptions={setColorOptions} />

        <ProductDetailsEditor product={product} specifications={specifications} includedItems={includedItems} setSpecifications={setSpecifications} setIncludedItems={setIncludedItems}/>

        <ProductSeoEditor product={product} seoPreview={seoPreview} slug={slug}/>
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

        <ProductReadinessPanel productMediaReady={productMediaReady} missingOptionMedia={missingOptionMedia} optionReadinessRows={optionReadinessRows} canActivate={canActivate} brandedProductionTemplateMissing={brandedProductionTemplateMissing} mediaWarnings={mediaWarnings}/>

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
