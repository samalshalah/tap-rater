import {expect,it,vi} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
// useState call order in ReviewsPurchaseForm: ..., connectLater (10), assigned (11).
const m=vi.hoisted(()=>({assigned:false,cursor:0}));
vi.mock('react',async original=>{const react=await original<typeof import('react')>();return {...react,useState:(initial:unknown)=>{const i=m.cursor++;return react.useState(i===11?m.assigned:initial);}};});
vi.mock('@/components/account/reviews-business-preview',()=>({ReviewsBusinessPreview:()=>createElement('div',null,'BUSINESS-PREVIEW')}));
import {ReviewsPurchaseForm} from '@/components/account/reviews-purchase-form';
const render=(assigned:boolean)=>{m.assigned=assigned;m.cursor=0;return renderToStaticMarkup(createElement(ReviewsPurchaseForm,{guest:true,focused:true}));};
it('offers paying before connecting Google for a new business',()=>{expect(render(false)).toContain('Subscribe now and connect Google after payment');});
it('hides that option when the business already has a Tap Rater connection',()=>{expect(render(true)).not.toContain('Subscribe now and connect Google after payment');});
