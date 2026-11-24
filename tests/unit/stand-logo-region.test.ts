import {expect,it} from 'vitest';
import {getPrintLogoRegion,maxLogoSizePercent} from '@/lib/print-artwork-renderer';
import {brandedStandComposition,regionToPixels} from '@/lib/branded-composition';
import {complimentaryFormCatalog} from '@/lib/complimentary-orders';
import {staticStorefrontProducts} from '@/lib/product-repository';

const logo=regionToPixels(brandedStandComposition.logoRegion);
const name=regionToPixels(brandedStandComposition.businessNameRegion);
const base={logoOffsetXPercent:0,logoOffsetYPercent:0};

it('lets the logo grow into the name area when no business name is printed',()=>{
  const old=getPrintLogoRegion(logo,{...base,logoSizePercent:180,showBusinessName:true});
  const big=getPrintLogoRegion(logo,{...base,logoSizePercent:maxLogoSizePercent,showBusinessName:false});
  expect(big.height).toBeGreaterThan(old.height);
  expect(big.y+big.height).toBeLessThanOrEqual(name.y+name.height);
  expect(big.x).toBeGreaterThanOrEqual(brandedStandComposition.safeMarginPx);
  expect(big.x+big.width).toBeLessThanOrEqual(brandedStandComposition.widthPx-brandedStandComposition.safeMarginPx);
});
it('keeps the logo clear of the business name when it is printed',()=>{
  const region=getPrintLogoRegion(logo,{...base,logoSizePercent:maxLogoSizePercent,showBusinessName:true});
  expect(region.y+region.height).toBeLessThanOrEqual(name.y-24);
});
it('names stands by the wording printed on them in the order form',()=>{
  const catalog=complimentaryFormCatalog(staticStorefrontProducts());
  expect(catalog.find(item=>item.slug==='rate-your-experience-stand')?.title).toBe('Rate Your Experience');
  expect(new Set(catalog.map(item=>item.title)).size).toBe(catalog.length);
});
