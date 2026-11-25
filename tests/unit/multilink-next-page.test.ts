import {describe,expect,it} from 'vitest';
import {findPageInCart,linksForNextPage,reviewPlaceId} from '@/components/product/multilink-next-page';
import type {CartItem} from '@/lib/cart';

const review=(placeId:string)=>({type:'google_review',url:`https://search.google.com/local/writereview?placeid=${placeId}`});
const page=(placeId:string,quantity=2)=>({productId:'rate-your-experience-stand',optionId:'branded_qr_direct',quantity,setup:{serviceAddon:'hosted_multilink',businessName:'Priority Toyota',multiLinkButtons:[review(placeId),{type:'website',url:'https://example.com'}]}} as unknown as CartItem);

describe('next Multi-Link page',()=>{
  it('reads the Google location a page reviews',()=>{
    expect(reviewPlaceId([{type:'website',url:'https://x.com'},review('ChIJ123')])).toBe('ChIJ123');
    expect(reviewPlaceId([{type:'google_review',url:''}])).toBeUndefined();
  });
  it('finds a location that already has a page in the cart',()=>{
    const items=[page('ChIJ-norfolk'),{productId:'x',optionId:'branded_qr_direct',quantity:1,setup:{serviceMode:'DIRECT'}} as unknown as CartItem];
    expect(findPageInCart(items,'ChIJ-norfolk')?.quantity).toBe(2);
    expect(findPageInCart(items,'ChIJ-chesapeake')).toBeUndefined();
    expect(findPageInCart(items,undefined)).toBeUndefined();
  });
  it('copies the links but not the Google review link',()=>{
    const next=linksForNextPage([{id:'1',type:'google_review',url:'https://g',label:'Google',enabled:true,position:0},{id:'2',type:'website',url:'https://example.com',label:'Website',enabled:true,position:1}] as never);
    expect(next.map(b=>b.url)).toEqual(['','https://example.com']);
  });
});
