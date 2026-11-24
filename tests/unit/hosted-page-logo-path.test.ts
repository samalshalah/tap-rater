import {expect,it,vi} from 'vitest';
const mocks=vi.hoisted(()=>({upload:vi.fn()}));
vi.mock('@/lib/customer-auth',()=>({requireCustomerApi:async()=>({session:{email:'owner@example.com'}})}));
vi.mock('@/lib/admin-media-storage',()=>({uploadProductMedia:mocks.upload,ProductMediaStorageError:class extends Error{status=400}}));
import {POST} from '@/app/api/account/hosted-page/logo/route';

it('stores page logos in a folder that does not reveal the customer',async()=>{
  mocks.upload.mockResolvedValue({storageKey:'products/hosted-page-logos/center_asset/x-logo.png'});
  const form=new FormData();form.set('file',new File([new Uint8Array([1,2,3])],'logo.png',{type:'image/png'}));
  expect((await POST(new Request('https://taprater.com/api/account/hosted-page/logo',{method:'POST',body:form}))).status).toBe(200);
  const input=mocks.upload.mock.calls[0][0];
  expect(input.productSlug).toBe('hosted-page-logos');
  expect(JSON.stringify(input)).not.toContain('owner');
});
