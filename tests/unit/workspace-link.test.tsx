import React from 'react';
import {beforeEach,expect,it,vi} from 'vitest';
Object.assign(globalThis,{React});
const state=vi.hoisted(()=>({destination:null as string|null}));
vi.mock('react',async original=>({...await original<typeof import('react')>(),useState:()=>[state.destination,(value:string)=>{state.destination=value;}]}));
import Link from 'next/link';
import {WorkspaceLink} from '@/components/account/workspace-link';
beforeEach(()=>{state.destination=null;});
it('does not prefetch on initial render and keeps Next navigation and accessibility props',()=>{
 const onClick=vi.fn();
 const link=WorkspaceLink({href:'/account/reviews?location=a',children:'Reviews',onClick,'aria-current':'page',className:'navigation'});
 expect(link.type).toBe(Link);
 expect(link.props).toMatchObject({href:'/account/reviews?location=a',prefetch:false,children:'Reviews','aria-current':'page',className:'navigation',onClick});
});
it.each(['onMouseEnter','onFocus'] as const)('prefetches only the intended destination on %s and preserves handlers',eventName=>{
 const handler=vi.fn();const props={href:'/account/reviews?location=a',children:'Reviews',[eventName]:handler};
 const event={} as never;
 WorkspaceLink(props).props[eventName](event);
 expect(handler).toHaveBeenCalledWith(event);
 expect(WorkspaceLink(props).props.prefetch).toBeNull();
 expect(WorkspaceLink({...props,href:'/account/reviews?location=b'}).props.prefetch).toBe(false);
});
