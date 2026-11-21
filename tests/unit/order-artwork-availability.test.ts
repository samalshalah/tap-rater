import {expect,it} from 'vitest';
import {readFileSync} from 'node:fs';
import {isOrderArtworkAvailable} from '@/lib/orders';

it('serves production artwork only for confirmed, unreversed payments',()=>{
 expect(isOrderArtworkAvailable({status:'paid',payment_status:'paid',stripe_refund_id:null,refund_status:null})).toBe(true);
 expect(isOrderArtworkAvailable({status:'paid',payment_status:'complimentary',stripe_refund_id:null,refund_status:null})).toBe(true);
 expect(isOrderArtworkAvailable({status:'canceled',payment_status:'refunded',stripe_refund_id:'re_1',refund_status:'succeeded'})).toBe(false);
 expect(isOrderArtworkAvailable({status:'paid',payment_status:'paid',stripe_refund_id:null,refund_status:'pending'})).toBe(false);
 expect(isOrderArtworkAvailable({status:'pending_payment',payment_status:'unpaid',stripe_refund_id:null,refund_status:null})).toBe(false);
});

it('uses the same rule in the artwork route and the order page, so the page never shows a preview the route refuses',()=>{
 expect(readFileSync('src/app/api/admin/orders/[id]/artwork/[lineItemIndex]/route.ts','utf8')).toContain('if (!isOrderArtworkAvailable(order)) {');
 const page=readFileSync('src/components/admin/order-detail-components.tsx','utf8');
 expect(page).toContain('const artworkLocked = !isOrderArtworkAvailable(order);');
 expect(page).toContain('Production artwork is locked because this order was refunded.');
});
