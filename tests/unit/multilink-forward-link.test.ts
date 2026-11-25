import {describe,expect,it} from 'vitest';
import {hostedPageForwardUrl,normalizeHostedPageForwardUrl,resolveHostedPageLifecycle,validateHostedPageSnapshot,type HostedPageSnapshot} from '@/lib/hosted-pages/snapshots';

const snapshot=(extra:Partial<HostedPageSnapshot>):HostedPageSnapshot=>validateHostedPageSnapshot({schemaVersion:1,code:'ZGBC6FKZH7T3',version:'v1',publishedAt:'2026-11-25T00:00:00.000Z',lifecycleStatus:'ACTIVE',businessName:'Priority Toyota',buttons:[],...extra});

describe('normalizeHostedPageForwardUrl',()=>{
  it('accepts https links and adds https:// when left out',()=>{
    expect(normalizeHostedPageForwardUrl('https://prioritytoyota.com/service')).toBe('https://prioritytoyota.com/service');
    expect(normalizeHostedPageForwardUrl(' prioritytoyota.com ')).toBe('https://prioritytoyota.com/');
  });
  it('refuses unsafe or looping links',()=>{
    for(const bad of ['http://example.com','javascript:alert(1)','ftp://example.com','localhost','https://user:pw@example.com','https://taprater.com/p/ZGBC6FKZH7T3','',`https://example.com/${'a'.repeat(500)}`])expect(normalizeHostedPageForwardUrl(bad)).toBeNull();
    expect(normalizeHostedPageForwardUrl('https://taprater.com/shop')).toBe('https://taprater.com/shop');
  });
});

describe('hostedPageForwardUrl',()=>{
  const forwardUrl='https://example.com/';
  it('only forwards once the paid time is over',()=>{
    expect(hostedPageForwardUrl(resolveHostedPageLifecycle(snapshot({forwardUrl})))).toBeNull();
    expect(hostedPageForwardUrl(resolveHostedPageLifecycle(snapshot({forwardUrl,lifecycleStatus:'CANCELLED_AT_PERIOD_END',subscriptionPaidThrough:'2026-12-25T00:00:00.000Z'}),new Date('2026-12-01')))).toBeNull();
    expect(hostedPageForwardUrl(resolveHostedPageLifecycle(snapshot({forwardUrl,lifecycleStatus:'CANCELLED_AT_PERIOD_END',subscriptionPaidThrough:'2026-12-25T00:00:00.000Z'}),new Date('2026-12-26')))).toBe(forwardUrl);
    expect(hostedPageForwardUrl(resolveHostedPageLifecycle(snapshot({forwardUrl,lifecycleStatus:'EXPIRED'})))).toBe(forwardUrl);
  });
  it('never forwards a page Tap Rater took down, or a page with no link',()=>{
    expect(hostedPageForwardUrl(resolveHostedPageLifecycle(snapshot({forwardUrl,lifecycleStatus:'RETIRED_INTERNAL'})))).toBeNull();
    expect(hostedPageForwardUrl(resolveHostedPageLifecycle(snapshot({lifecycleStatus:'EXPIRED'})))).toBeNull();
  });
  it('rejects a bad link when the page is saved',()=>{
    expect(()=>snapshot({forwardUrl:'http://example.com'})).toThrow('https://');
  });
});
