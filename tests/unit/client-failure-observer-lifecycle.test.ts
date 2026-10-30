import {it,expect,vi,afterEach} from 'vitest';
const hooks=vi.hoisted(()=>({setup:null as null|(()=>void|(()=>void))}));
vi.mock('react',()=>({useEffect:(setup:()=>void|(()=>void))=>{hooks.setup=setup;}}));
import {ClientFailureObserver} from '@/components/account/client-failure-observer';
afterEach(()=>vi.unstubAllGlobals());

it('reports real network failures but ignores departed pages and unmounted requests',async()=>{
 const events=new EventTarget();
 const request=vi.fn().mockRejectedValue(new TypeError('network unavailable'));
 const report=vi.fn().mockResolvedValue(new Response('{}'));
 const page={fetch:request,location:{hostname:'taprater.com',href:'https://taprater.com/account',origin:'https://taprater.com',pathname:'/account'},addEventListener:events.addEventListener.bind(events),removeEventListener:events.removeEventListener.bind(events)};
 vi.stubGlobal('window',page);vi.stubGlobal('fetch',report);
 ClientFailureObserver();const cleanup=hooks.setup!() as ()=>void;
 await expect(page.fetch('/api/account/local')).rejects.toThrow();expect(report).toHaveBeenCalledOnce();
 page.location.pathname='/account/reviews';events.dispatchEvent(new Event('pagehide'));
 await expect(page.fetch('/api/account/local')).rejects.toThrow();expect(report).toHaveBeenCalledOnce();
 events.dispatchEvent(new Event('pageshow'));
 await expect(page.fetch('/api/account/local')).rejects.toThrow();expect(report).toHaveBeenCalledTimes(2);
 const wrapped=page.fetch;cleanup();expect(page.fetch).toBe(request);
 page.location.pathname='/account/orders';await expect(wrapped('/api/account/local')).rejects.toThrow();expect(report).toHaveBeenCalledTimes(2);
});
