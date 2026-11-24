import {describe,expect,it} from 'vitest';
import {applyGoogleReviewUrl,createInitialMultiLinkButtons,createMultiLinkButton} from '@/components/product/product-setup-model';

const review='https://search.google.com/local/writereview?placeid=abc';

describe('applyGoogleReviewUrl',()=>{
  it('fills the existing Google button',()=>{
    const result=applyGoogleReviewUrl(createInitialMultiLinkButtons(),review);
    expect(result).toHaveLength(3);
    expect(result.find(button=>button.type==='google_review')?.url).toBe(review);
    expect(result.filter(button=>button.url)).toHaveLength(1);
  });
  it('adds a Google button at the top when there is none',()=>{
    const result=applyGoogleReviewUrl([createMultiLinkButton('website',0)],review);
    expect(result.map(button=>[button.type,button.position,button.url])).toEqual([['google_review',0,review],['website',1,'']]);
  });
  it('leaves a full page alone',()=>{
    const full=Array.from({length:10},(_,i)=>createMultiLinkButton('website',i));
    expect(applyGoogleReviewUrl(full,review)).toBe(full);
  });
});

import {normalizeMultiLinkButtonsForSetup} from '@/components/product/product-setup-model';
describe('normalizeMultiLinkButtonsForSetup',()=>{
  it('skips rows without a web address instead of blocking',()=>{
    const rows=createInitialMultiLinkButtons();
    rows[1]={...rows[1],url:'https://example.com/review'};
    const result=normalizeMultiLinkButtonsForSetup(rows);
    expect(result.error).toBeUndefined();
    expect(result.buttons.map(button=>[button.type,button.position])).toEqual([['google_review',0]]);
  });
  it('still rejects an address that is not a web link',()=>{
    const rows=[{...createMultiLinkButton('website',0),url:'not a link'}];
    expect(normalizeMultiLinkButtonsForSetup(rows).error).toBe('Enter a valid URL for Multi-Link row 1.');
  });
});
