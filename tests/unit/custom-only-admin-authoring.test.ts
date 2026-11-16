import {describe,expect,it,vi} from 'vitest';
import {brandedQrDirectProductOption,standardDirectProductOption,getDefaultOptionsForProductKind,lockedProductOptionTemplates} from '@/lib/catalog-architecture';
import {getDefaultOptionsForProductKind as repositoryDefaults} from '@/lib/catalog-architecture-repository';
import {buildInitialOptions,cleanAssetSet,getOptionMediaRequirements} from '@/components/admin/product-editor-model';
import {productContentSchema} from '@/lib/product-catalog-validators';
import {normalizeStorefrontProductRow} from '@/lib/product-row-normalizer';
import {getProductPurchaseOptions} from '@/lib/purchase-options';
import {saveProductContent,type CmsDbClient} from '@/lib/cms-repository';
const assets={standardAngledImageUrl:'/old-standard.png',standardFrontTemplateUrl:'/old-standard-front.png',brandedAngledImageUrl:'/custom.png',brandedFrontTemplateUrl:'/custom-front.png'};
const input=()=>productContentSchema.parse({slug:'custom-fixture',title:'Custom fixture',sku:'CUSTOM',categorySlug:'reviews',basePriceCents:4900,stockStatus:'instock',shortDescription:'Custom stand',description:'Custom stand',assetSet:assets,productOptions:[standardDirectProductOption,brandedQrDirectProductOption],isActive:true});
describe('custom-only catalog authoring',()=>{
 it('never seeds the retired generic option in defaults or existing-product editors',()=>{
  for(const kind of ['normal_direct','custom_direct'] as const){
   expect(getDefaultOptionsForProductKind(kind).map(o=>o.optionCode)).toEqual(['branded_qr_direct']);
   expect(repositoryDefaults(kind).map(o=>o.optionCode)).toEqual(['branded_qr_direct']);
   for(const mode of ['create','edit'] as const)expect(buildInitialOptions(kind,[standardDirectProductOption,brandedQrDirectProductOption],lockedProductOptionTemplates,mode).map(o=>o.optionCode)).toEqual(['branded_qr_direct']);
  }
  expect(lockedProductOptionTemplates.some(o=>o.optionCode==='standard_direct')).toBe(false);
 });
 it('requires only custom media and never repopulates standard asset fields',()=>{
  expect(getOptionMediaRequirements('standard_direct',assets)).toEqual([]);
  expect(getOptionMediaRequirements('branded_qr_direct',{...assets,standardAngledImageUrl:'',standardFrontTemplateUrl:''}).filter(r=>r.required).map(r=>r.value)).toEqual(['/custom-front.png']);
  expect(cleanAssetSet(assets,'/main.png')).toMatchObject({standardAngledImageUrl:undefined,standardFrontTemplateUrl:undefined,brandedAngledImageUrl:'/custom.png',brandedFrontTemplateUrl:'/custom-front.png'});
 });
 it('drops legacy standard options from API/CSV input while retaining custom settings',()=>{
  expect(input().productOptions).toEqual([brandedQrDirectProductOption]);
 });
 it('keeps custom product lookup and sellability with cleared generic metadata',()=>{
  const product=normalizeStorefrontProductRow({slug:'google-review-stand',title:'Custom Google stand',sku:'GOOGLE',category_slug:'reviews',format:'stand',base_price_cents:4900,is_active:true,status:'active',stock_status:'instock',checkout_mode:'buy_now',standard_angled_image_url:null,standard_front_template_url:null,branded_angled_image_url:'/custom.png',branded_front_template_url:'/custom-front.png'});
  expect(product?.assetSet?.brandedFrontTemplateUrl).toBe('/custom-front.png');
  expect(getProductPurchaseOptions({...product!,purchaseOptions:[brandedQrDirectProductOption]}).map(o=>o.id)).toEqual(['branded_qr_direct']);
 });
 it('prevents typed or stale callers from re-inserting generic options or asset metadata',async()=>{
  const upsert=vi.fn(async(_value: any,_options?: any)=>({error:null})),insert=vi.fn(async()=>({error:null})),eq=vi.fn(async()=>({error:null}));
  const client={from:()=>({upsert,insert,delete:()=>({eq})})} as unknown as CmsDbClient;
  await saveProductContent(client,{...input(),productOptions:[standardDirectProductOption,brandedQrDirectProductOption]});
  expect(upsert).toHaveBeenCalledWith(expect.objectContaining({standard_angled_image_url:null,standard_front_template_url:null,branded_front_template_url:'/custom-front.png'}));
  const optionWrite=upsert.mock.calls.find(([value])=>Array.isArray(value));
  expect(optionWrite?.[0]).toEqual([expect.objectContaining({option_code:'branded_qr_direct',price_cents:4900})]);
 });
});
