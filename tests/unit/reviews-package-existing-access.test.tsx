import React from 'react';
import {beforeEach,expect,it,vi} from 'vitest';
const m=vi.hoisted(()=>({auth:vi.fn(),access:vi.fn()}));
vi.mock('@/lib/customer-auth',()=>({requireCustomerApi:m.auth}));
vi.mock('@/lib/customer-marketing-access',()=>({hasCustomerMarketingAccess:m.access}));
vi.mock('@/lib/marketing-subscriptions',()=>({marketingCheckoutEnabled:()=>true}));
vi.mock('@/components/account/marketing-purchase',()=>({MarketingPurchaseCard:()=>null}));
import {ReviewsLandingPurchase} from '@/components/account/reviews-landing-purchase';
Object.assign(globalThis,{React});
beforeEach(()=>vi.resetAllMocks());
it.each([true,false])('uses service access independently of a Stripe subscription (%s)',async allowed=>{
 m.auth.mockResolvedValue({session:{email:'existing@example.test'}});m.access.mockResolvedValue(allowed);
 const page=await ReviewsLandingPurchase();
 const card=page!.props.children.props.children.at(-1);
 expect(card.props).toMatchObject({guest:false,serviceManaged:allowed});
 expect(m.access).toHaveBeenCalledExactlyOnceWith('existing@example.test');
});
it('keeps guest purchasing available without querying an account',async()=>{
 m.auth.mockResolvedValue({session:null});
 const page=await ReviewsLandingPurchase();
 expect(page!.props.children.props.children.at(-1).props).toMatchObject({guest:true,serviceManaged:false});
 expect(m.access).not.toHaveBeenCalled();
});
it('does not present a new purchase when existing access cannot be checked',async()=>{
 m.auth.mockResolvedValue({session:{email:'existing@example.test'}});m.access.mockRejectedValue(Error('Access unavailable'));
 await expect(ReviewsLandingPurchase()).rejects.toThrow('Access unavailable');
});
