import {beforeEach,describe,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({sql:vi.fn(),limit:vi.fn()}));
vi.mock('@/lib/google-business/live-reviews',()=>({liveDb:()=>mocks.sql}));
vi.mock('@/lib/public-rate-limit',()=>({checkPublicRateLimit:mocks.limit}));
import {classifyHostedPageDevice,isLikelyBot,readHostedPageTracking,standTargetUrl} from '@/lib/hosted-pages/tracking';
import {renderHostedPageHtml} from '@/lib/hosted-pages/render-html';
import {GET,POST} from '@/app/api/hosted-pages/events/route';
import {buildComplimentaryOrder} from '@/lib/complimentary-orders';
import {staticStorefrontProducts} from '@/lib/product-repository';

const code='6Y2XVQS9QHKM';
const iphone='Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1';
const snapshot={schemaVersion:1 as const,code,version:'v1',publishedAt:new Date().toISOString(),lifecycleStatus:'ACTIVE' as const,businessName:'Demo Motors',buttons:[{id:'g1',label:'Google Review',type:'review' as const,iconKey:'google_review' as const,url:'https://g.page/r/x',isVisible:true}],appearance:{theme:'light' as const,accentColor:'#eb0a1e'}};
beforeEach(()=>{vi.resetAllMocks();mocks.limit.mockResolvedValue({limited:false});mocks.sql.mockResolvedValue([]);});

describe('link tags',()=>{
  it('tags Tap Rater page links for QR and NFC, with an optional stand ID',()=>{
    expect(standTargetUrl(`https://taprater.com/p/${code}`,'qr')).toBe(`https://taprater.com/p/${code}?s=qr`);
    expect(standTargetUrl(`https://taprater.com/p/${code}`,'nfc','ST-ABCD1234')).toBe(`https://taprater.com/p/${code}?s=nfc&st=ST-ABCD1234`);
    expect(standTargetUrl('https://g.page/r/x','qr')).toBe('https://g.page/r/x');
    expect(standTargetUrl(`https://taprater.com/p/${code}?s=nfc`,'qr')).toBe(`https://taprater.com/p/${code}?s=nfc`);
  });
  it('reads tags from the page URL and ignores bad ones',()=>{
    expect(readHostedPageTracking(new URL(`https://taprater.com/p/${code}?s=nfc&st=ST-ABCD1234`))).toEqual({source:'nfc',standId:'ST-ABCD1234'});
    expect(readHostedPageTracking(new URL(`https://taprater.com/p/${code}?s=evil&st=<x>`))).toEqual({source:'direct',standId:undefined});
  });
  it('classifies phones and skips bots',()=>{
    expect(classifyHostedPageDevice(iphone)).toBe('ios');
    expect(classifyHostedPageDevice('Mozilla/5.0 (Linux; Android 15)')).toBe('android');
    expect(isLikelyBot('Googlebot/2.1')).toBe(true);
    expect(isLikelyBot(iphone)).toBe(false);
  });
});

describe('public page',()=>{
  it('adds an open pixel and click pings only when tracking is on',()=>{
    const live=renderHostedPageHtml({state:'available',snapshot},{tracking:{source:'qr',standId:'ST-ABCD1234'}});
    expect(live).toContain('/api/hosted-pages/events?e=view&amp;c=6Y2XVQS9QHKM&amp;s=qr&amp;st=ST-ABCD1234');
    expect(live).toContain('ping="/api/hosted-pages/events?e=click&amp;c=6Y2XVQS9QHKM&amp;s=qr&amp;st=ST-ABCD1234&amp;b=g1&amp;t=google_review"');
    expect(live).toContain('href="https://g.page/r/x"');
    expect(renderHostedPageHtml({state:'available',snapshot})).not.toContain('/api/hosted-pages/events');
  });
  it('counts opens on the being-set-up page too',()=>{
    expect(renderHostedPageHtml({state:'available',snapshot:{...snapshot,buttons:[]}},{tracking:{source:'nfc'}})).toContain('e=view');
  });
});

describe('event recording',()=>{
  const req=(query:string,method='GET',ua=iphone)=>new Request(`https://taprater.com/api/hosted-pages/events?${query}`,{method,headers:{'user-agent':ua}});
  it('records a page open and always returns the pixel',async()=>{
    const response=await GET(req(`e=view&c=${code}&s=qr&st=ST-ABCD1234`));
    expect(response.headers.get('content-type')).toBe('image/gif');
    expect(mocks.sql.mock.calls[0].slice(1)).toEqual([code,'view','qr',null,null,'ios','ST-ABCD1234',code]);
    expect(mocks.sql.mock.calls[0][0].join(' ')).toContain('retired_at IS NULL');
  });
  it('records a link click from a ping',async()=>{
    expect((await POST(req(`e=click&c=${code}&s=nfc&b=g1&t=google_review`,'POST'))).status).toBe(204);
    expect(mocks.sql.mock.calls[0].slice(1)).toEqual([code,'click','nfc','g1','google_review','ios',null,code]);
  });
  it('ignores bots, bad input and rate-limited callers',async()=>{
    await GET(req(`e=view&c=${code}`,'GET','Googlebot/2.1'));
    await GET(req('e=view&c=nope'));
    await POST(req(`e=click&c=${code}`,'POST'));
    mocks.limit.mockResolvedValue({limited:true});
    await GET(req(`e=view&c=${code}`));
    expect(mocks.sql).not.toHaveBeenCalled();
  });
});

it('complimentary stands print a QR tagged as a scan and an NFC tagged as a tap',()=>{
  const order=buildComplimentaryOrder({requestId:'00000000-0000-4000-8000-000000000003',productId:'rate-your-experience-stand',optionId:'branded_qr_direct',quantity:1,businessName:'Demo Motors',destinationUrl:`https://taprater.com/p/${code}`,logoStorageKey:'product-media/logo.png',design:{fontSizePercent:100,logoSizePercent:100,logoOffsetXPercent:0,logoOffsetYPercent:0,logoFitMode:'contain',showBusinessNameOnProof:false},delivery:'pickup',orderType:'Sales demo',customer:{name:'Demo Client',email:'client@example.com'}} as never,staticStorefrontProducts());
  const setup=order.line_items_json[0].setup as Record<string,unknown>;
  expect(setup.qrTargetUrl).toBe(`https://taprater.com/p/${code}?s=qr`);
  expect(setup.nfcTargetUrl).toBe(`https://taprater.com/p/${code}?s=nfc`);
  expect(setup.destinationUrl).toBe(`https://taprater.com/p/${code}`);
});
