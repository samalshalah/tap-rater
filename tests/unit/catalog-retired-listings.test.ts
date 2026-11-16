import {beforeEach,expect,it,vi} from 'vitest';
import {PaymentMemoryDb} from '../helpers/payment-memory-db';
const state=vi.hoisted(()=>({configured:true,client:null as any}));
vi.mock('@/lib/db',()=>({hasSupabaseAdminConfig:()=>state.configured,getSupabaseAdmin:()=>state.client}));
vi.mock('@/lib/public-data-cache',()=>({publicDataCache:(read:unknown)=>read,catalogCacheTag:'catalog'}));
vi.mock('next/cache',()=>({unstable_noStore:()=>{}}));
import {getStorefrontProducts,getCheckoutProducts,getStorefrontProductBySlugFromClient,staticStorefrontProducts} from '@/lib/product-repository';
import {retiredProductRedirects} from '@/lib/storefront-redirects';
const slugs=['book-appointment-stand','connect-with-us-stand','view-menu-stand','menu-and-order-stand'];
beforeEach(()=>{
 state.configured=true;
 state.client=new PaymentMemoryDb({
  products:slugs.map(slug=>({slug,title:slug,category_slug:'reviews',format:'stand',design_mode:'logo',is_active:true,status:'active',stock_status:'instock',checkout_mode:'buy_now',product_kind:'normal_direct',branded_front_template_url:'/fixture-template.png',base_price_cents:4900})),
  product_options:slugs.map(product_slug=>({id:product_slug+'-custom',product_slug,option_code:'branded_qr_direct',title:'Custom',price_cents:4900,is_active:true,sort_order:1}))
 });
});
it('lists canonical cards once without removing retired records from checkout or direct lookup',async()=>{
 expect((await getStorefrontProducts()).map(p=>p.slug).sort()).toEqual(['connect-with-us-stand','menu-and-order-stand']);
 expect((await getCheckoutProducts()).map(p=>p.slug).sort()).toEqual([...slugs].sort());
 for(const slug of ['book-appointment-stand','view-menu-stand']){
  expect((await getStorefrontProductBySlugFromClient(state.client,slug))?.slug).toBe(slug);
  expect(retiredProductRedirects[slug as keyof typeof retiredProductRedirects]).toMatch(/^\/product\//);
 }
});
it('also removes redirect-only aliases from the unconfigured fallback listing',async()=>{
 state.configured=false;
 const products=await getStorefrontProducts();
 expect(products).toEqual(staticStorefrontProducts());
 expect(products.every(p=>!Object.hasOwn(retiredProductRedirects,p.slug))).toBe(true);
 expect(products.some(p=>p.slug==='connect-with-us-stand')).toBe(true);
 expect(products.some(p=>p.slug==='menu-and-order-stand')).toBe(true);
});
