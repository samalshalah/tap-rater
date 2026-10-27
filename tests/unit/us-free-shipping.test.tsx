import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from 'vitest';
import {defaultOffers,offerShippingSettings,offersSchema,quoteOffers} from '@/lib/offers';
import {resolveCheckoutShippingRule} from '@/lib/shipping-rules';
import {OfferSummary} from '@/components/cart/offer-summary';
import {ProductOffers} from '@/components/product/product-offers';
Object.assign(globalThis,{React});
it('makes every US subtotal free while preserving non-US flat, manual and threshold rules',()=>{
 const base={shippingMode:'flat' as const,flatShippingAmountCents:1200};
 for(const subtotal of [0,1,3900,5999,6000,100000])expect(resolveCheckoutShippingRule(subtotal,offerShippingSettings(base,defaultOffers,'US'))).toMatchObject({amountCents:0,mode:'free'});
 expect(resolveCheckoutShippingRule(3900,offerShippingSettings(base,defaultOffers,'CA')).amountCents).toBe(1200);
 expect(resolveCheckoutShippingRule(3900,offerShippingSettings({...base,shippingMode:'manual'},defaultOffers,'CA')).mode).toBe('manual');
 const offers={...defaultOffers,shipping:{...defaultOffers.shipping,countryCodes:['US','CA']}};
 expect(resolveCheckoutShippingRule(5999,offerShippingSettings(base,offers,'CA')).amountCents).toBe(1200);expect(resolveCheckoutShippingRule(6000,offerShippingSettings(base,offers,'CA')).amountCents).toBe(0);
});
it('inherits US policy for saved configurations and allows an explicit country list without expanding destinations',()=>{
 const {freeCountryCodes,...legacy}=defaultOffers.shipping;const offers=offersSchema.parse({...defaultOffers,shipping:legacy});const settings={shippingMode:'flat' as const,allowedCountryCodes:['US']};
 expect(offerShippingSettings(settings,offers,'US')).toMatchObject({shippingMode:'free',allowedCountryCodes:['US']});
 expect(offerShippingSettings(settings,{...offers,shipping:{...offers.shipping,freeCountryCodes:[]}},'US').shippingMode).toBe('flat');
 expect(offersSchema.safeParse({...offers,shipping:{...offers.shipping,freeCountryCodes:['invalid']}}).success).toBe(false);
});
it('removes the obsolete US minimum from product and cart offer copy',()=>{
 const quote=quoteOffers([{productId:'google-review-stand',optionId:'standard_direct',quantity:1,unitAmountCents:3900}],defaultOffers);
 for(const node of [React.createElement(OfferSummary,{quote,offers:defaultOffers}),React.createElement(ProductOffers,{settings:defaultOffers})]){const html=renderToStaticMarkup(node);expect(html).toContain('Free shipping on US orders. No minimum.');expect(html).not.toContain('Add $');expect(html).not.toContain('Free shipping at');}
});
