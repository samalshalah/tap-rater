import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import { MobileAccountOverview } from '@/components/account/mobile-account-overview';
import type { CustomerPortalData, CustomerPortalOrder } from '@/lib/customer-portal';
const base: CustomerPortalData = { configured:true,customer:null,businesses:[],devices:[],orders:[],invoices:[],stands:[],subscriptions:[] };
const order: CustomerPortalOrder = { id:'1',reference:'cs_fixture',status:'paid',paymentStatus:'paid',paymentMethodLabel:'Card',productionStatus:'not_started',shippingStatus:'not_shipped',subtotalCents:3900,shippingAmountCents:1200,totalCents:5334,currency:'usd',itemCount:1,items:[] };
function html(patch: Partial<CustomerPortalOrder>) { return renderToStaticMarkup(createElement(MobileAccountOverview,{portal:{...base,orders:[{...order,...patch}]}})); }
describe('mobile account order progress',()=>{
 it('does not claim production has started after payment alone',()=>{expect(html({})).toContain('Payment received');expect(html({})).not.toContain('Preparing your stand');});
 it('shows actual production and shipping status',()=>{expect(html({productionStatus:'in_production'})).toContain('Preparing your stand');expect(html({shippingStatus:'shipped'})).toContain('On its way');expect(html({shippingStatus:'delivered'})).toContain('Delivered');});
 it('does not show successful progress for refunds',()=>{const result=html({paymentStatus:'refunded'});expect(result).toContain('canceled or refunded');expect(result).not.toContain('aria-label="Order progress"');});
 it('shows a useful shopping action for customers with no orders',()=>{expect(renderToStaticMarkup(createElement(MobileAccountOverview,{portal:base}))).toContain('Your first stand starts here.');});
});
