import {describe,expect,it} from 'vitest';
import {brandedStandComposition,regionToPixels,sharpLogoSizePercent} from '@/lib/branded-composition';

const region=regionToPixels(brandedStandComposition.logoRegion);
// Same rule as production-artwork: the logo may not be enlarged more than 1% when printed.
const printsSharp=(w:number,h:number,size:number)=>Math.min(Math.round(region.width*size/100)/w,Math.round(region.height*size/100)/h)<=1.01;

describe('sharpLogoSizePercent',()=>{
 it('keeps the preferred size for a large logo',()=>{expect(sharpLogoSizePercent(2000,600,135)).toBe(135);});
 it('picks the largest sharp size for a small trimmed logo instead of failing the preview',()=>{
  const size=sharpLogoSizePercent(160,160,135);
  expect(size).toBeLessThan(135);expect(printsSharp(160,160,size)).toBe(true);expect(printsSharp(160,160,size+5)).toBe(false);
 });
 it('never goes below the editor minimum',()=>{expect(sharpLogoSizePercent(20,20,125)).toBe(50);});
 it('keeps the preferred size when dimensions are unknown',()=>{expect(sharpLogoSizePercent(0,0,125)).toBe(125);});
});
