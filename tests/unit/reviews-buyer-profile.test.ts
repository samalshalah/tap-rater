import {beforeEach,it,expect,vi} from 'vitest';
const m=vi.hoisted(()=>({sql:vi.fn()}));
vi.mock('@/lib/google-business/live-reviews',()=>({liveDb:()=>m.sql}));
import {prepareMarketingBuyer} from '@/lib/marketing-subscriptions';
import {reviewsBuyerProfileSchema} from '@/lib/reviews-buyer-profile';
const profile={firstName:'Jane',lastName:'Doe',phone:'+1 (540) 555-0123'};
beforeEach(()=>vi.resetAllMocks());
it('saves all submitted profile fields on a new pending customer without granting access',async()=>{
 m.sql.mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([{account_status:'pending_activation'}]);
 await prepareMarketingBuyer(' NEW@example.test ','Unused business name',undefined,profile);
 const insert=m.sql.mock.calls[1];expect(insert[0].join('')).toContain("'pending_activation'");expect(insert[0].join('')).toContain('first_name,last_name,phone');
 expect(insert).toContain('new@example.test');expect(insert).toContain('Jane Doe');expect(insert).toContain('Jane');expect(insert).toContain('Doe');expect(insert).toContain(profile.phone);
 expect(m.sql.mock.calls.every(c=>!c[0].join('').includes('UPDATE'))).toBe(true);
});
it('stores no phone when the optional field is blank',async()=>{
 m.sql.mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([{account_status:'pending_activation'}]);
 await prepareMarketingBuyer('new@example.test','Jane Doe',undefined,{...profile,phone:''});expect(m.sql.mock.calls[1]).toContain(null);
});
it('requires sign-in for an active account and never overwrites its profile',async()=>{
 m.sql.mockResolvedValue([{id:'existing',account_status:'active'}]);await expect(prepareMarketingBuyer('existing@example.test','Changed',undefined,profile)).rejects.toThrow('Sign in');expect(m.sql).toHaveBeenCalledTimes(1);
});
it('keeps an authenticated existing profile unchanged',async()=>{
 m.sql.mockResolvedValue([{id:'existing',account_status:'active'}]);await prepareMarketingBuyer('existing@example.test','Changed','existing@example.test',profile);expect(m.sql.mock.calls.every(c=>c[0].join('').startsWith('SELECT'))).toBe(true);
});
it('preserves pending profile details on a repeated checkout',async()=>{
 m.sql.mockResolvedValue([{id:'pending',account_status:'pending_activation'}]);await prepareMarketingBuyer('pending@example.test','Changed',undefined,profile);expect(m.sql.mock.calls.every(c=>c[0].join('').startsWith('SELECT'))).toBe(true);
});
it('validates required names and accepts optional international contact numbers',()=>{
 expect(reviewsBuyerProfileSchema.safeParse({...profile,firstName:'  '}).success).toBe(false);
 expect(reviewsBuyerProfileSchema.safeParse({...profile,phone:'wrong'}).success).toBe(false);
 expect(reviewsBuyerProfileSchema.parse({firstName:' Jane ',lastName:'Doe'})).toEqual({firstName:'Jane',lastName:'Doe',phone:''});
});
