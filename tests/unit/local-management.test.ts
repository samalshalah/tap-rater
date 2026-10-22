import {describe,it,expect,vi,afterEach} from 'vitest';
import {localMutation,mutateLocal,publicUrl} from '@/lib/local-management';
const id='9fb3ee3b-0920-4db5-a03d-7245987a8751';
const record={action:'saveListing',businessId:id,directory:'Apple Maps',status:'listed',listingUrl:'https://maps.apple.com/',listedName:'Branch',listedAddress:'Main Street',listedPhone:'',notes:'',version:0};
afterEach(()=>vi.clearAllMocks());
describe('local directory validation',()=>{
 it.each(['javascript:alert(1)','data:text/html,test','https://user:password@example.com'])('rejects unsafe link %s',url=>expect(publicUrl.safeParse(url).success).toBe(false));
 it('accepts tracking without claiming an API connection',()=>{expect(localMutation.safeParse(record).success).toBe(true);expect(localMutation.safeParse({...record,status:'connected'}).success).toBe(false);});
 it('rejects arbitrary action and injected publication fields',()=>{expect(localMutation.safeParse({...record,publish:true}).success).toBe(false);expect(localMutation.safeParse({action:'publish'}).success).toBe(false);});
 it('does not allow customers to choose another account for a new location',async()=>{const sql=vi.fn();await expect(mutateLocal({kind:'customer',email:'one@example.com'},{action:'createLocation',customerId:id,name:'Branch 2',address:'',phone:'',website:''},sql as never)).rejects.toMatchObject({status:403});expect(sql).not.toHaveBeenCalled();});
 it('reports conflicting saves without overwriting',async()=>{const sql=vi.fn().mockResolvedValue([]);await expect(mutateLocal({kind:'customer',email:'one@example.com'},record,sql as never)).rejects.toMatchObject({status:409});});
});
