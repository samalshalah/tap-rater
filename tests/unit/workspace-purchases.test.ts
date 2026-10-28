import {beforeEach,expect,it,vi} from 'vitest';
const m=vi.hoisted(()=>({client:null as any,access:vi.fn(),locations:vi.fn()}));
vi.mock('@/lib/db',()=>({getSupabaseAdmin:()=>m.client,hasSupabaseAdminConfig:()=>true}));
vi.mock('@/lib/customer-marketing-access',()=>({hasCustomerMarketingAccess:m.access}));
vi.mock('@/lib/customer-navigation-locations',()=>({customerNavigationLocations:m.locations}));
import {customerPurchaseSummary,getCustomerWorkspaceExperience} from '@/lib/customer-workspace-experience';
import {getCustomerPortalFromClient} from '@/lib/customer-portal';

function database(rows:Record<string,unknown[]|undefined>){
 const reads:string[]=[];const filters:unknown[]=[];
 const client={from:(table:string)=>{reads.push(table);const q:any={select:()=>q,eq:(...args:unknown[])=>{filters.push([table,...args]);return q;},in:()=>q,order:()=>q,maybeSingle:async()=>({data:rows[table]?.[0]??null}),then:(resolve:any)=>Promise.resolve({data:rows[table]||[]}).then(resolve)};return q;}};
 return {client,reads,filters};
}
beforeEach(()=>{vi.clearAllMocks();m.access.mockResolvedValue(true);m.locations.mockResolvedValue([]);});
it.each([
 {},
 {devices:[{id:'device',device_code:'code'}]},
 {devices:[{id:'invalid',device_code:''}]},
 {orders:[{id:'order',stripe_checkout_session_id:'reference',line_items_json:[{title:'Stand',quantity:2}]}]},
 {orders:[{id:'order',line_items_json:[{title:'Stand'}]}]},
 ...['ACTIVE','EXPIRED','PAST_DUE'].map(lifecycle_status=>({hosted_subscriptions:[{id:'sub',hosted_page_url:'https://example.test/page',permanent_code:'page',lifecycle_status}]})),
 {hosted_subscriptions:[{id:'sub',hosted_page_url:'https://example.test/page',permanent_code:'page',stripe_subscription_id:'manual:licence',current_period_end:'2020-01-01',lifecycle_status:'ACTIVE'}]},
])('matches full portal navigation without invoices, businesses or tap reads: %j',async rows=>{
 const data={customers:[{id:'customer',email:'owner@example.test'}],...rows};
 const small=database(data);const summary=await customerPurchaseSummary(small.client,' OWNER@example.test ');
 const full=await getCustomerPortalFromClient(database(data).client,'owner@example.test');
 expect(summary.stands).toBe(full.stands.length>0||full.devices.length>0||full.subscriptions.length>0);
 expect(summary.multilink).toBe(full.subscriptions.some(item=>['ACTIVE','REACTIVATED','PAST_DUE','CANCELLED_AT_PERIOD_END'].includes(item.lifecycleStatus)&&(!(item.cancelAtPeriodEnd||item.source==='manual'||item.source==='admin')||!item.currentPeriodEnd||Date.parse(item.currentPeriodEnd)>Date.now())));
 expect(small.reads.sort()).toEqual(['customers','devices','hosted_subscriptions','orders']);
 expect(small.filters).toContainEqual(['customers','email','owner@example.test']);
 expect(small.filters).toContainEqual(['orders','email','owner@example.test']);
 expect(small.filters).toContainEqual(['devices','customer_id','customer']);
});
it('starts navigation once access resolves without waiting for the purchase summary',async()=>{
 let release!:(value:unknown)=>void;
 m.client={from:()=>({select(){return this;},eq(){return this;},maybeSingle:()=>new Promise(resolve=>{release=resolve;})})};
 const result=getCustomerWorkspaceExperience('owner@example.test');
 await vi.waitFor(()=>expect(m.locations).toHaveBeenCalledWith('owner@example.test'));
 release({data:null});expect(await result).toMatchObject({service:true,stands:false,locationsError:false});
});
it.each([false,'failure'])('does not query navigation without service access (%s)',async mode=>{
 m.client=database({}).client;
 if(mode===false)m.access.mockResolvedValue(false);else m.access.mockRejectedValue(new Error('private'));
 expect(await getCustomerWorkspaceExperience('owner@example.test')).toMatchObject({service:false,unavailable:mode==='failure',locations:[]});
 expect(m.locations).not.toHaveBeenCalled();
});
it('retains the navigation retry state on a location read failure',async()=>{
 m.client=database({}).client;m.locations.mockRejectedValue(new Error('private'));
 expect(await getCustomerWorkspaceExperience('owner@example.test')).toMatchObject({service:true,locations:[],locationsError:true});
});

