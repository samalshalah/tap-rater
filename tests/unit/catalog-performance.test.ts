import {describe,it,expect} from 'vitest';
import {formatPrice} from '@/lib/products';
import {normalizeStorefrontProductRow as fromRepository} from '@/lib/product-repository';
import {normalizeStorefrontProductRow as fromNormalizer} from '@/lib/product-row-normalizer';
import {migratedProducts} from '@/data/migrated-products';

describe('shared currency formatting',()=>{
 it.each([0,-0,1,-1,99,100,3900,123456789,0.5,-0.5,Number.NaN,Infinity,-Infinity])('preserves USD output for %s cents',(cents)=>{
  expect(formatPrice(cents)).toBe(new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents/100));
 });
 it('does not retain a previous amount between calls',()=>{
  expect([3900,0,5900,3900].map(formatPrice)).toEqual(['$39.00','$0.00','$59.00','$39.00']);
 });
});
describe('product normalizer public compatibility',()=>{
 it('keeps the repository export and direct normalization consistent for the catalog',()=>{
  expect(fromRepository).toBe(fromNormalizer);
  for(const product of migratedProducts)expect(fromRepository(product)).toEqual(fromNormalizer(product));
 });
});
