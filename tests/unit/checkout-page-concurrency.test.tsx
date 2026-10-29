import React from 'react';
import {expect,it,vi} from 'vitest';
const m=vi.hoisted(()=>({tax:vi.fn(),offers:vi.fn(),shipping:vi.fn()}));
vi.mock('@/lib/tax-settings',()=>({getTaxSettings:m.tax}));
vi.mock('@/lib/offer-settings',()=>({getOffersSettings:m.offers}));
vi.mock('@/lib/shipping-settings',()=>({getShippingSettings:m.shipping}));
vi.mock('@/lib/marketing-subscriptions',()=>({marketingCheckoutEnabled:()=>true}));
vi.mock('@/lib/stripe-public-config',()=>({validateStripePublicConfig:()=>({configured:true})}));
vi.mock('@/components/checkout/embedded-checkout',()=>({EmbeddedCheckoutClient:()=>null}));
import CheckoutPage from '@/app/checkout/page';
Object.assign(globalThis,{React});
it('starts all pricing settings reads before any resolves and preserves their values',async()=>{
 let resolveTax!:(v:unknown)=>void,resolveOffers!:(v:unknown)=>void,resolveShipping!:(v:unknown)=>void;
 m.tax.mockImplementation(()=>new Promise(r=>resolveTax=r));m.offers.mockImplementation(()=>new Promise(r=>resolveOffers=r));m.shipping.mockImplementation(()=>new Promise(r=>resolveShipping=r));
 const pending=CheckoutPage();
 expect(m.tax).toHaveBeenCalledTimes(1);expect(m.offers).toHaveBeenCalledTimes(1);expect(m.shipping).toHaveBeenCalledTimes(1);
 const tax={manualTaxRateBps:600},offers={enabled:true},shipping={flatRateCents:500};resolveTax(tax);resolveOffers(offers);resolveShipping(shipping);
 const page=await pending;const props=page.props.children.props.children.props.children.props;
 expect(props).toMatchObject({taxSettings:tax,offers,shippingSettings:shipping,marketingAvailable:false});
});
it('still rejects a settings outage instead of rendering stale checkout prices',async()=>{
 m.tax.mockResolvedValue({});m.shipping.mockResolvedValue({});m.offers.mockRejectedValue(Error('Offers unavailable'));
 await expect(CheckoutPage()).rejects.toThrow('Offers unavailable');
});
