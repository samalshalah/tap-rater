import {beforeEach,describe,expect,it,vi} from 'vitest';
import type {HostedPageSnapshot} from '@/lib/hosted-pages/snapshots';

const state=vi.hoisted(()=>({snapshot:null as HostedPageSnapshot|null,sql:vi.fn(),limited:false}));
vi.mock('@/lib/hosted-pages/app-storage',()=>({getHostedPageStorage:async()=>({})}));
vi.mock('@/lib/hosted-pages/repository',()=>({readCurrentHostedPageSnapshot:async()=>state.snapshot}));
vi.mock('@/lib/google-business/live-reviews',()=>({liveDb:()=>state.sql}));
vi.mock('@/lib/public-rate-limit',()=>({checkPublicRateLimit:async()=>({limited:state.limited})}));
const {GET}=await import('@/app/api/hosted-pages/forward/route');

const code='ZGBC6FKZH7T3';
const page=(extra:Partial<HostedPageSnapshot>):HostedPageSnapshot=>({schemaVersion:1,code,version:'v1',publishedAt:'2026-11-25T00:00:00.000Z',lifecycleStatus:'EXPIRED',businessName:'Priority Toyota',buttons:[],forwardUrl:'https://prioritytoyota.com/',...extra});
const phone={'user-agent':'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)'};

describe('forwarded visits',()=>{
  beforeEach(()=>{state.sql.mockReset().mockResolvedValue([]);state.limited=false;});
  it('counts the visit and where it went, then forwards',async()=>{
    state.snapshot=page({});
    const response=await GET(new Request(`https://taprater.com/api/hosted-pages/forward?c=${code}&s=qr`,{headers:phone}));
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('https://prioritytoyota.com/');
    expect(state.sql).toHaveBeenCalledTimes(1);
    const values=state.sql.mock.calls[0].slice(1);
    expect(values).toEqual(expect.arrayContaining([code,'qr','ios','forwarded']));
  });
  it('does not count bots, but still forwards them',async()=>{
    state.snapshot=page({});
    const response=await GET(new Request(`https://taprater.com/api/hosted-pages/forward?c=${code}`,{headers:{'user-agent':'curl/8'}}));
    expect(response.status).toBe(302);
    expect(state.sql).not.toHaveBeenCalled();
  });
  it('never redirects a live page or a page without a link',async()=>{
    state.snapshot=page({lifecycleStatus:'ACTIVE'});
    expect((await GET(new Request(`https://taprater.com/api/hosted-pages/forward?c=${code}`,{headers:phone}))).status).toBe(200);
    state.snapshot=page({forwardUrl:undefined});
    expect((await GET(new Request(`https://taprater.com/api/hosted-pages/forward?c=${code}`,{headers:phone}))).status).toBe(200);
    expect(state.sql).not.toHaveBeenCalled();
  });
});
