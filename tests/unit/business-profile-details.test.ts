import {describe,it,expect,vi} from 'vitest';
import {createGoogleBusinessClient} from '@/lib/google-business/client';
import {businessDetails,mergeBusinessDraft,type BusinessDetails} from '@/lib/google-business/business-details';
describe('business profile import',()=>{
 it('imports structured details, explicit false payments and every media page without writes',async()=>{
  const fetcher=vi.fn(async(url:URL,init?:RequestInit)=>{
   expect(init?.method).toBe('GET');
   const value=url.pathname.endsWith('/attributes')?{attributes:[{name:'attributes/pay_credit_card',values:[false]},{name:'attributes/url_instagram',uriValues:[{uri:'https://instagram.com/example'}]}]}:url.pathname.endsWith('/media')?url.searchParams.has('pageToken')?{mediaItems:[{name:'photo2',googleUrl:'https://example.com/2.jpg',locationAssociation:{category:'COVER'}}]}:{mediaItems:[{name:'photo1',googleUrl:'https://example.com/1.jpg',locationAssociation:{category:'PROFILE'}}],nextPageToken:'second'}:{name:'locations/one',storefrontAddress:{addressLines:['Main St'],locality:'City',regionCode:'US'},openInfo:{status:'OPEN'},categories:{primaryCategory:{name:'gcid:boutique'}},moreHours:[{hoursTypeId:'PICKUP',periods:[{openDay:'MONDAY',closeDay:'MONDAY',openTime:{hours:9},closeTime:{hours:17}}]}]};
   return new Response(JSON.stringify(value));
  });
  const result=await createGoogleBusinessClient('test',fetcher as typeof fetch).getBusinessDetails('accounts/a/locations/one');
  expect(result.media).toHaveLength(2);expect(result.logo).toBe('https://example.com/1.jpg');expect(result.cover).toBe('https://example.com/2.jpg');expect(result.paymentMethods).toContain('No');expect(result.socialLinks).toBe('https://instagram.com/example');expect(result.moreHours).toContain('09:00');expect(result.city).toBe('City');expect(result.categoryIds).toEqual(['gcid:boutique']);
 });
 it('shows unavailable optional sources without fabricating missing data',async()=>{
  const fetcher=vi.fn(async(url:URL)=>new Response(JSON.stringify(url.pathname==='\/v1/locations/one'?{name:'locations/one'}:{}),{status:url.pathname==='\/v1/locations/one'?200:403}));
  const result=await createGoogleBusinessClient('test',fetcher as typeof fetch).getBusinessDetails('accounts/a/locations/one');
  expect(result.mediaStatus).toBe('unavailable');expect(result.attributesStatus).toBe('unavailable');expect(result.paymentMethods).toBeUndefined();expect(result.media).toBeUndefined();expect(result.addressVisibility).toBe('unknown');
 });
 it('rejects assignment traversal before requesting Google',async()=>{const f=vi.fn();await expect(createGoogleBusinessClient('test',f).getBusinessDetails('accounts/a/locations/one/../two')).rejects.toThrow();expect(f).not.toHaveBeenCalled();});
 it('preserves explicit client edits, including cleared fields, while enriching old drafts',()=>{
  const observed:{name:string;details:BusinessDetails}={name:'Google',details:{city:'New city',logo:'https://example.com/logo.jpg',paymentMethods:'Credit card'}};
  expect(mergeBusinessDraft(observed,{name:'Client',details:{paymentMethods:''}})).toEqual({name:'Client',details:{city:'New city',logo:'https://example.com/logo.jpg',paymentMethods:''}});
 });
 it('rejects executable media links and invalid coordinates',()=>{expect(businessDetails.safeParse({logo:'javascript:alert(1)'}).success).toBe(false);expect(businessDetails.safeParse({latitude:999}).success).toBe(false);});
});
