import {expect,it} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {LiveCard} from '@/components/account/google-live-review-card';
const review={id:'r1',version:3,draft:'Thanks for visiting.',approved_version:null,publish_state:'idle',suspected_spam:false,scheduled_at:null,data:{starRating:'TWO',comment:'Slow service',createTime:'2026-11-19T00:00:00Z',reviewer:{displayName:'Pat'}}} as never;
const render=(canPublish:boolean)=>renderToStaticMarkup(createElement(LiveCard,{review,workspace:{} as never,post:async()=>({}),refresh:async()=>{},canPublish,aiAllowed:true,active:true}));
it('gives draft-only customers Copy reply and Open on Google instead of Submit',()=>{
 const html=render(false);
 expect(html).toContain('Copy reply');expect(html).toContain('https://business.google.com/reviews');
 expect(html).not.toContain('Submit to Google');expect(html).not.toContain('Submit it to Google');
});
it('keeps Submit to Google for publishing customers',()=>{
 const html=render(true);
 expect(html).toContain('Submit to Google');expect(html).not.toContain('Copy reply');
});
