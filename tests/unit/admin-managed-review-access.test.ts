import {beforeEach,expect,it,vi} from 'vitest';
import {GET,POST} from '@/app/api/admin/customers/[id]/locations/[locationId]/reviews/route';
const mocks=vi.hoisted(()=>({identity:vi.fn(),query:vi.fn(),reviews:vi.fn(),savePrefs:vi.fn()}));
vi.mock('@/lib/google-business/http',()=>({googleAdminIdentity:mocks.identity}));
vi.mock('@/lib/google-business/live-review-core',()=>({liveDb:()=>mocks.query}));
vi.mock('@/lib/google-business/live-http',()=>({runLiveReviews:mocks.reviews}));
vi.mock('@/lib/review-email-preferences',async original=>({...await original<object>(),saveEmailPrefs:mocks.savePrefs}));
const account='ffe1cea0-0ddd-4982-89b4-197e6046f384',location='e3aadb16-a9bd-49fc-ac84-7ead434f2b44';
const context={params:Promise.resolve({id:account,locationId:location})};
const url='https://taprater.com/api/admin/customers/'+account+'/locations/'+location+'/reviews';
beforeEach(()=>{
  vi.resetAllMocks();
  mocks.identity.mockResolvedValue({owner:'staff@example.test'});
  mocks.query.mockResolvedValue([{email:'client@example.test'}]);
  mocks.reviews.mockResolvedValue(Response.json({}));
});
it('requires an admin session before reading the selected client',async()=>{
  mocks.identity.mockResolvedValue(null);
  expect((await GET(new Request(url),context)).status).toBe(401);
  expect(mocks.query).not.toHaveBeenCalled();
});
it('passes only the resolved customer and selected location into review actions',async()=>{
  const request=new Request(url+'?businessId='+account);
  await GET(request,context);
  expect(mocks.query.mock.calls[0].slice(1)).toEqual([account,location]);
  expect(mocks.reviews).toHaveBeenCalledWith(request,{kind:'customer',email:'client@example.test'},'staff@example.test',location);
});
it('refuses an unavailable client/location combination',async()=>{
  mocks.query.mockResolvedValue([]);
  expect((await GET(new Request(url),context)).status).toBe(404);
  expect(mocks.reviews).not.toHaveBeenCalled();
});
it('rejects a notification change for another location even with a valid admin login',async()=>{
  const request=new Request(url+'?view=notifications',{method:'POST',headers:{origin:'https://taprater.com'},body:JSON.stringify({
    businessId:account,version:1,lowMode:'daily',highMode:'off',weekly:true,monthly:false,hour:9,zone:'UTC'
  })});
  expect((await POST(request,context)).status).toBe(404);
  expect(mocks.savePrefs).not.toHaveBeenCalled();
});
