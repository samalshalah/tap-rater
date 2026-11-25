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

import {readHostedPageForwardUrl,saveHostedPageForwardUrl} from '@/lib/hosted-pages/forward-link';
import {assignPermanentHostedPageCode,publishHostedPageSnapshot,readCurrentHostedPageSnapshot,type HostedPageTextStorage} from '@/lib/hosted-pages/repository';

function memoryStorage():HostedPageTextStorage{
  const files=new Map<string,string>();
  return {getText:async key=>files.get(key)??null,putText:async(key,value)=>{files.set(key,value);},putTextIfAbsent:async(key,value)=>{if(files.has(key))return false;files.set(key,value);return true;}};
}

describe('saveHostedPageForwardUrl',()=>{
  it('saves, reads and clears the link without changing the page',async()=>{
    const storage=memoryStorage();
    await assignPermanentHostedPageCode(storage,{physicalProductRef:'page-1',code:'ZGBC6FKZH7T3'});
    await publishHostedPageSnapshot(storage,snapshot({lifecycleStatus:'CANCELLED_AT_PERIOD_END',subscriptionPaidThrough:'2026-12-25T00:00:00.000Z',headline:'Rate Your Experience'}));
    expect(await saveHostedPageForwardUrl(storage,'ZGBC6FKZH7T3','prioritytoyota.com')).toEqual({ok:true,forwardUrl:'https://prioritytoyota.com/'});
    expect(await readHostedPageForwardUrl(storage,'ZGBC6FKZH7T3')).toBe('https://prioritytoyota.com/');
    const page=await readCurrentHostedPageSnapshot(storage,'ZGBC6FKZH7T3');
    expect(page).toMatchObject({lifecycleStatus:'CANCELLED_AT_PERIOD_END',subscriptionPaidThrough:'2026-12-25T00:00:00.000Z',headline:'Rate Your Experience'});
    expect(await saveHostedPageForwardUrl(storage,'ZGBC6FKZH7T3','')).toEqual({ok:true,forwardUrl:null});
    expect(await readHostedPageForwardUrl(storage,'ZGBC6FKZH7T3')).toBeNull();
  });
  it('refuses bad links and pages that were never published',async()=>{
    const storage=memoryStorage();
    expect(await saveHostedPageForwardUrl(storage,'ZGBC6FKZH7T3','http://example.com')).toMatchObject({ok:false,status:400});
    expect(await saveHostedPageForwardUrl(storage,'ZGBC6FKZH7T3','https://example.com')).toMatchObject({ok:false,status:409});
  });
});
