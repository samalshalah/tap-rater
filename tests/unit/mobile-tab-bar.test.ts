import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi } from 'vitest';
import { MobileTabBar } from '@/components/layout/mobile-tab-bar';
const state = vi.hoisted(()=>({path:'/',count:0}));
vi.mock('next/navigation',()=>({usePathname:()=>state.path}));
vi.mock('@/components/cart/cart-provider',()=>({useCart:()=>({count:state.count})}));
describe('mobile primary navigation',()=>{
 it.each([['/','Home'],['/product/google-review-stand','Shop'],['/category/reviews','Shop'],['/account/orders','Account'],['/cart','Cart']])('marks the correct destination for %s',(path,label)=>{
 state.path=path; state.count=0;
 const html=renderToStaticMarkup(createElement(MobileTabBar));
 expect(html.match(/aria-current="page"/g)).toHaveLength(1);
 expect(html).toMatch(new RegExp('aria-current="page" aria-label="'+label));
 });
 it('keeps a singular cart label and an accessible count',()=>{state.path='/cart';state.count=1;expect(renderToStaticMarkup(createElement(MobileTabBar))).toContain('aria-label="Cart, 1 item"');});
});
