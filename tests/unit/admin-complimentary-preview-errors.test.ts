import {beforeEach,expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({auth:vi.fn(),products:vi.fn(),compose:vi.fn()}));
vi.mock('@/lib/admin-auth',()=>({requireAdminApi:mocks.auth}));
vi.mock('@/lib/product-repository',()=>({getCheckoutProducts:mocks.products}));
vi.mock('@/lib/admin-media-storage',()=>({isSafeProductMediaKey:()=>true}));
vi.mock('@/lib/complimentary-orders',async original=>({...await original<object>(),complimentaryCatalog:()=>[{product:{slug:'rate-your-experience-stand',title:'RYE',sku:'s',assetSet:{brandedFrontTemplateUrl:'/t.png'}},options:[{id:'branded_qr_direct'}]}]}));
vi.mock('@/lib/production-artwork',()=>({getProductionArtworkTemplate:()=>({}),composeProductionArtworkDocument:mocks.compose}));
import {POST} from '@/app/api/admin/orders/complimentary/preview/route';

const request=()=>new Request('https://taprater.com/api/admin/orders/complimentary/preview',{method:'POST',headers:{origin:'https://taprater.com','Content-Type':'application/json'},body:JSON.stringify({item:{productId:'rate-your-experience-stand',setup:{destinationUrl:'https://taprater.com/p/6Y2XVQS9QHKM',logoStorageKey:'logo.png',logoSizePercent:250}}})});
beforeEach(()=>{vi.resetAllMocks();mocks.auth.mockResolvedValue(null);mocks.products.mockResolvedValue([]);});

it('tells the admin when the logo is too small and how big it can go',async()=>{
  mocks.compose.mockRejectedValue(new Error('This logo file is too small to print sharply at 250%. The largest sharp size for this logo is 135%. Upload a larger version of the logo (at least 1000 pixels wide works best) to go bigger.'));
  const body=await (await POST(request())).json();
  expect(body.error).toContain('largest sharp size for this logo is 135%');
});
it('keeps unexpected failures generic',async()=>{
  const log=vi.spyOn(console,'error').mockImplementation(()=>{});
  mocks.compose.mockRejectedValue(new Error('R2 timeout secret-bucket'));
  const body=await (await POST(request())).json();
  expect(body.error).toBe('Could not render this design. Check the logo and retry.');
  expect(log).toHaveBeenCalled();
});
