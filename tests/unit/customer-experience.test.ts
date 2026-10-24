import {beforeEach,it,expect,vi} from 'vitest';
const m=vi.hoisted(()=>({portal:vi.fn(),access:vi.fn()}));
vi.mock('@/lib/customer-portal',()=>({getCustomerPortal:m.portal}));
vi.mock('@/lib/customer-marketing-access',()=>({hasCustomerMarketingAccess:m.access}));
import {getCustomerExperience} from '@/lib/customer-experience';
beforeEach(()=>vi.resetAllMocks());
it.each([[true,false],[false,true],[true,true]])('resolves purchased stands %s and service %s independently',async(stands,service)=>{
 m.portal.mockResolvedValue({stands:stands?[{id:'own-stand'}]:[],devices:[],subscriptions:[]});m.access.mockResolvedValue(service);
 expect(await getCustomerExperience('client@example.test')).toMatchObject({stands,service,unavailable:false});
 expect(m.portal).toHaveBeenCalledWith('client@example.test');expect(m.access).toHaveBeenCalledWith('client@example.test');
});
it('retains legacy device and multi-link access without service',async()=>{
 for(const key of ['devices','subscriptions']){m.portal.mockResolvedValue({stands:[],devices:[],subscriptions:[],[key]:[{}]});m.access.mockResolvedValue(false);expect(await getCustomerExperience('legacy@example.test')).toMatchObject({stands:true,service:false});}
});
it('does not treat an outage as permission to load service data',async()=>{
 m.portal.mockResolvedValue({stands:[{}],devices:[],subscriptions:[]});m.access.mockRejectedValue(Error('private'));
 expect(await getCustomerExperience('client@example.test')).toMatchObject({stands:true,service:false,unavailable:true});
});

it.each([["ACTIVE",true],["EXPIRED",false],["RETIRED_INTERNAL",false]])("Multi-Link navigation uses licence state %s",async(lifecycleStatus,expected)=>{
 m.portal.mockResolvedValue({stands:[],devices:[],subscriptions:[{lifecycleStatus}]});m.access.mockResolvedValue(false);
 expect(await getCustomerExperience("owner@example.test")).toMatchObject({multilink:expected,service:false});
});
