import {describe,it,expect} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {MountWhenActive} from '@/components/ui/mount-when-active';
import {buildProductTableMetadata} from '@/components/admin/admin-products-table-model';
import {createBlankAdminProduct} from '@/lib/admin-products';

describe('deferred panels',()=>{
 it('does not render closed panel children',()=>{
  function MustNotRender(){throw new Error('Hidden panel was loaded');return null;}
  expect(renderToStaticMarkup(createElement(MountWhenActive,{active:false,children:createElement(MustNotRender)}))).toBe('');
 });
 it('renders an activated panel immediately',()=>{
  expect(renderToStaticMarkup(createElement(MountWhenActive,{active:true,children:createElement('input',{defaultValue:'Retained draft'})}))).toContain('Retained draft');
 });
});
describe('product table metadata',()=>{
 it('keeps incomplete products unready',()=>{const row=buildProductTableMetadata(createBlankAdminProduct());expect(row.productReady).toBe(false);expect(row.productStatus).toBe('draft');expect(row.assetStatus).toBe('draft_missing_assets');});
 it('preserves readiness and media warnings separately',()=>{
  const product={...createBlankAdminProduct(),slug:'ready',title:'Ready Stand',images:[{src:'/main.png',alt:'Ready'}],assetSet:{standardAngledImageUrl:'/main.png',brandedAngledImageUrl:'/branded.png',brandedFrontTemplateUrl:'/template.svg'}};
  expect(buildProductTableMetadata(product).productReady).toBe(true);
  expect(buildProductTableMetadata({...product,assetSet:{...product.assetSet,brandedAngledImageUrl:'/main.png'}}).productReady).toBe(false);
 });
 it('reflects updated searchable fields and publishing status',()=>{
  const original={...createBlankAdminProduct(),title:'Original',sku:'ABC'};const first=buildProductTableMetadata(original);
  const changed=buildProductTableMetadata({...original,title:'Updated',status:'active'});
  expect(first.searchText).toContain('original');expect(changed.searchText).toContain('updated');expect(changed.searchText).toContain('abc');expect(changed.productStatus).toBe('active');expect(first.productStatus).toBe('draft');
 });
});
