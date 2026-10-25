import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect,vi,beforeEach} from 'vitest';
const state=vi.hoisted(()=>({path:'/account/reviews',id:'one'}));
vi.mock('next/navigation',()=>({usePathname:()=>state.path,useRouter:()=>({refresh:vi.fn()}),useSearchParams:()=>new URLSearchParams({location:state.id})}));
import {AccountNavigation,AccountContext} from '@/components/account/account-navigation';
import {activeLocationId,locationToolHref,locationTools,navigationForPurchases} from '@/lib/customer-navigation';
import {customerNavigationLocations} from '@/lib/customer-navigation-locations';
const locations=[{id:'one',name:'First Business',address:'First Street'},{id:'two',name:'Second Business',address:'Second Street'}];
beforeEach(()=>{state.path='/account/reviews';state.id='one';});
describe('shared workspace navigation',()=>{
 it.each(['one','two'])('scopes all child links to selected location %s',id=>{
 state.id=id;const html=renderToStaticMarkup(createElement(AccountNavigation,{links:navigationForPurchases({service:true,stands:true}),locations}));
 for(const tool of locationTools)expect(html).toContain(`href="${locationToolHref(tool.href,id)}"`);
 expect(html).not.toContain('href="/account/reviews"');expect(html).not.toContain('href="/account/heatmap"');
 expect(html).toContain(`href="/account/stands?location=${id}"`);expect(html.match(/aria-current="page"/g)).toHaveLength(1);
 expect(html.match(/aria-label="Local marketing"/g)).toHaveLength(1);
 expect(html).toContain('aria-label="Account navigation"');expect(html).not.toContain('First Street');
 expect(html).toContain(`href="/account/orders?location=${id}"`);
 });
 it('does not expand an unknown or other-account location',()=>{state.id='foreign';const html=renderToStaticMarkup(createElement(AccountNavigation,{links:navigationForPurchases({service:true}),locations}));expect(html).not.toContain('tr-location-sidebar-tools');expect(activeLocationId('foreign',locations)).toBe('');});
 it('keeps stand-only customers free of the location tree',()=>{const html=renderToStaticMarkup(createElement(AccountNavigation,{links:navigationForPurchases({stands:true})}));expect(html).not.toContain('tr-location-sidebar');expect(html).not.toContain('Google Reviews');});
 it('uses an explicit all-locations overview so a remembered location cannot override it',()=>{state.id='';const html=renderToStaticMarkup(createElement(AccountNavigation,{links:navigationForPurchases({service:true}),locations}));expect(html).toContain('href="/account?location="');});
 it('loads only active account-owned locations, excluding removed ones',async()=>{const sql=vi.fn().mockResolvedValue([{id:'one',business_name:'First Business',address:null}]);expect(await customerNavigationLocations('SAM@example.com',sql as never)).toEqual([{id:'one',name:'First Business',address:''}]);const [parts,...values]=sql.mock.calls[0];expect(parts.join('?')).toContain("b.status IS DISTINCT FROM 'marketing_removed'");expect(parts.join('?')).toContain('lower(c.email)=');expect(values).toContain('sam@example.com');});
});

it('places business identity in one shared location picker',()=>{const html=renderToStaticMarkup(createElement(AccountContext,{locations,enabled:true}));expect(html).toContain('aria-label="Business location"');expect(html.match(/First Street/g)).toHaveLength(2);expect(html).toContain('value="one" selected');});
