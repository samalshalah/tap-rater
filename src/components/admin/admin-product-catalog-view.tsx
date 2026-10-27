"use client";
import {ProductMobileField,ProductStatusControl,ProductThumbnail,ReadinessYesNoBadge} from './admin-products-table-fields';
import {findTitle,formatBusinessUses,formatPriceRange,getProductStatus,type buildProductTableMetadata} from './admin-products-table-model';
import type {AdminProductsTableProps} from './admin-products-table-types';
import type {MigratedProduct,ProductStatus} from '@/data/migrated-products';
import {Edit3,ExternalLink,Trash2} from 'lucide-react';
import Link from 'next/link';
import {AdminButton,AdminExternalButton,AdminIconButton,AdminLinkButton,AdminResponsiveTable} from './admin-ui';
type Props=Pick<AdminProductsTableProps,'standTypes'|'businessUses'|'canDelete'>&{filteredProducts:MigratedProduct[];productMetadata:Map<MigratedProduct,ReturnType<typeof buildProductTableMetadata>>;selectedSlugs:Set<string>;savingStatusSlugs:Set<string>;isDeleting:boolean;allSelected:boolean;toggleSelectAll:()=>void;toggleProduct:(slug:string)=>void;updateProductStatus:(product:MigratedProduct,status:ProductStatus)=>Promise<void>;deleteProducts:(slugs:string[],label:string)=>Promise<void>};
export function AdminProductCatalogView({filteredProducts,productMetadata,selectedSlugs,savingStatusSlugs,isDeleting,allSelected,toggleSelectAll,toggleProduct,updateProductStatus,deleteProducts,standTypes,businessUses,canDelete}:Props){return <AdminResponsiveTable
        className="rounded-none border-0 shadow-none"
        table={
        <table className="w-full min-w-[920px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-[#f7f8fa] text-xs uppercase text-muted">
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-line accent-brand"
                  checked={allSelected}
                  disabled={filteredProducts.length === 0 || isDeleting}
                  aria-label="Select all filtered products"
                  onChange={toggleSelectAll}
                />
              </th>
              <th className="px-4 py-3 w-[92px]">Image</th>
              <th className="px-4 py-3 w-[230px]">Product</th>
              <th className="px-4 py-3 w-[90px]">Sort</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Uses</th>
              <th className="px-4 py-3 w-[130px]">Price</th>
              <th className="px-4 py-3">Readiness</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product) => {
              const {productKind, options, readiness, brandedReadiness, productReady} = productMetadata.get(product)!;

              return (
                <tr
                  className={
                    selectedSlugs.has(product.slug)
                      ? "border-b border-line bg-teal-50/40 last:border-b-0"
                      : "border-b border-line hover:bg-gray-50/70 last:border-b-0"
                  }
                  key={product.slug}
                >
                  <td className="px-4 py-3 align-middle">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-line accent-brand"
                      checked={selectedSlugs.has(product.slug)}
                      disabled={isDeleting}
                      aria-label={`Select ${product.title}`}
                      onChange={() => toggleProduct(product.slug)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <ProductThumbnail product={product} />
                  </td>
                  <td className="px-4 py-3">
                    <Link className="block font-semibold text-ink hover:text-brand" href={`/admin/products/${product.slug}`}>
                      {product.title}
                    </Link>
                    <span className="mt-1 block text-xs text-muted">{product.sku || product.slug}</span>
                  </td>
                  <td className="px-4 py-3 font-semibold text-ink">{product.sortOrder ?? 1000}</td>
                  <td className="px-4 py-3 text-muted">{findTitle(standTypes, product.standTypeSlug) ?? "-"}</td>
                  <td className="px-4 py-3 text-muted">{formatBusinessUses(product, businessUses)}</td>
                  <td className="px-4 py-3 font-semibold text-ink">{formatPriceRange(options, product)}</td>
                  <td className="px-4 py-3">
                    <ReadinessYesNoBadge ready={productReady} />
                  </td>
                  <td className="px-4 py-3">
                    <ProductStatusControl
                      status={getProductStatus(product)}
                      disabled={savingStatusSlugs.has(product.slug)}
                      onChange={(nextStatus) => updateProductStatus(product, nextStatus)}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <AdminLinkButton className="min-h-9 px-3 py-1.5 text-xs" variant="outline" href={`/admin/products/${product.slug}`}>
                        <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                        Edit
                      </AdminLinkButton>
                      <AdminExternalButton
                        aria-label={`View ${product.title} in store`}
                        title={`View ${product.title} in store`}
                        className="h-9 min-h-9 w-9 px-0 py-0"
                        variant="outline"
                        href={`/product/${product.slug}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" aria-hidden="true" />
                      </AdminExternalButton>
                      <AdminIconButton
                        type="button"
                        className="h-9 w-9"
                        variant="danger"
                        disabled={!canDelete || isDeleting}
                        label={`Delete ${product.title}`}
                        onClick={() => deleteProducts([product.slug], product.title)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </AdminIconButton>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filteredProducts.length === 0 ? (
              <tr>
                <td className="p-10 text-center text-muted" colSpan={10}>
                  No products match these filters.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        }
        cards={
          filteredProducts.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted">No products match these filters.</p>
          ) : (
            filteredProducts.map((product) => {
              const {productKind, options, readiness, brandedReadiness, productReady} = productMetadata.get(product)!;

              return (
                <article key={product.slug} className={selectedSlugs.has(product.slug) ? "rounded-xl border border-brand bg-teal-50/40 p-4" : "rounded-xl border border-line bg-white p-4"}>
                  <div className="flex gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-line accent-brand"
                      checked={selectedSlugs.has(product.slug)}
                      disabled={isDeleting}
                      aria-label={`Select ${product.title}`}
                      onChange={() => toggleProduct(product.slug)}
                    />
                    <ProductThumbnail product={product} />
                    <div className="min-w-0 flex-1">
                      <Link className="block font-semibold leading-5 text-ink hover:text-brand" href={`/admin/products/${product.slug}`}>
                        {product.title}
                      </Link>
                      <p className="mt-1 text-xs text-muted">{product.sku || product.slug}</p>
                    </div>
                  </div>
                  <dl className="mt-4 grid gap-3 text-sm">
                    <ProductMobileField label="Type" value={findTitle(standTypes, product.standTypeSlug) ?? "-"} />
                    <ProductMobileField label="Sort" value={String(product.sortOrder ?? 1000)} strong />
                    <ProductMobileField label="Uses" value={formatBusinessUses(product, businessUses)} />
                    <ProductMobileField label="Price" value={formatPriceRange(options, product)} strong />
                    <ProductMobileField label="Readiness" value={productReady ? "Yes" : "No"} strong={productReady} />
                  </dl>
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                    <ProductStatusControl
                      status={getProductStatus(product)}
                      disabled={savingStatusSlugs.has(product.slug)}
                      onChange={(nextStatus) => updateProductStatus(product, nextStatus)}
                    />
                    <div className="flex flex-wrap justify-end gap-2">
                    <AdminLinkButton className="min-h-9 px-3 py-1.5 text-xs" variant="outline" href={`/admin/products/${product.slug}`}>
                      <Edit3 className="h-3.5 w-3.5" aria-hidden="true" />
                      Edit
                    </AdminLinkButton>
                    <AdminExternalButton
                      aria-label={`View ${product.title} in store`}
                      title={`View ${product.title} in store`}
                      className="h-9 min-h-9 w-9 px-0 py-0"
                      variant="outline"
                      href={`/product/${product.slug}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </AdminExternalButton>
                    <AdminButton
                      className="min-h-9 px-3 py-1.5 text-xs"
                      type="button"
                      variant="danger"
                      disabled={!canDelete || isDeleting}
                      onClick={() => deleteProducts([product.slug], product.title)}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      Delete
                    </AdminButton>
                    </div>
                  </div>
                </article>
              );
            })
          )
        }
      />;}
