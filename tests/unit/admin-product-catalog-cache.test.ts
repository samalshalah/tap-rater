import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect} from 'vitest';
import {migratedProducts} from '@/data/migrated-products';
import {buildProductTableMetadata,createProductTableMetadataCache} from '@/components/admin/admin-products-table-model';
import {AdminProductCatalogView} from '@/components/admin/admin-product-catalog-view';
Object.assign(globalThis,{React});
const product={...migratedProducts[0],slug:'fixture',title:'Fixture Product',status:'draft' as const,isActive:false};
describe('admin catalog metadata cache',()=>{
 it('returns equivalent metadata and reuses the same product entry',()=>{const cache=createProductTableMetadataCache();const metadata=cache(product);expect(metadata).toEqual(buildProductTableMetadata(product));expect(cache(product)).toBe(metadata);});
 it('recomputes changed product status and retains unaffected entries',()=>{const cache=createProductTableMetadataCache(),other={...product,slug:'other'};const old=cache(product),unchanged=cache(other);const next=cache({...product,status:'active',isActive:true});expect(next).not.toBe(old);expect(next.productStatus).toBe('active');expect(old.productStatus).toBe('draft');expect(cache(other)).toBe(unchanged);});
 it('updates search and readiness when product data is replaced',()=>{const cache=createProductTableMetadataCache();cache(product);const changed={...product,title:'New title',sku:'NEW-SKU',images:[],assetSet:undefined};expect(cache(changed)).toEqual(buildProductTableMetadata(changed));expect(cache(changed).searchText).toContain('new title');});
 it('does not share cache entries between catalog instances',()=>{expect(createProductTableMetadataCache()(product)).not.toBe(createProductTableMetadataCache()(product));});
 const props={filteredProducts:[product],productMetadata:new Map([[product,buildProductTableMetadata(product)]]),selectedSlugs:new Set<string>(),savingStatusSlugs:new Set<string>(),isDeleting:false,allSelected:false,toggleSelectAll:()=>{},toggleProduct:()=>{},updateProductStatus:async()=>{},deleteProducts:async()=>{},standTypes:[],businessUses:[],canDelete:true};
 it('preserves desktop and mobile product links, selection, readiness and status controls',()=>{const html=renderToStaticMarkup(React.createElement(AdminProductCatalogView,props));for(const text of ['Select all filtered products','Select Fixture Product','/admin/products/fixture','/product/fixture','Readiness','Status'])expect(html).toContain(text);expect((html.match(/Select Fixture Product/g)||[]).length).toBe(2);});
 it('keeps deletion permission guards and selected/saving state',()=>{const html=renderToStaticMarkup(React.createElement(AdminProductCatalogView,{...props,canDelete:false,isDeleting:true,selectedSlugs:new Set(['fixture']),savingStatusSlugs:new Set(['fixture']),allSelected:true}));expect(html).toContain('checked=""');expect(html).toContain('disabled=""');expect(html).toContain('Delete Fixture Product');});
 it('renders both empty filtered states',()=>{const html=renderToStaticMarkup(React.createElement(AdminProductCatalogView,{...props,filteredProducts:[]}));expect((html.match(/No products match these filters./g)||[]).length).toBe(2);});
});
