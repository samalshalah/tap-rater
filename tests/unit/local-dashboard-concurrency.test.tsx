import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it,vi} from 'vitest';
vi.mock('next/dynamic',()=>({default:()=>()=>React.createElement('span',{'data-deferred-view':true})}));
import {LocalDashboardViews} from '@/components/account/local-dashboard-views';
Object.assign(globalThis,{React});
const props={tab:'reviews' as const,data:null,visible:[],selected:undefined,location:'location-a',customer:'',accountLocations:[],query:'',setQuery:()=>{},listingStatus:new Map(),choose:()=>{},openTab:()=>{},refresh:async()=>{},admin:false,save:async()=>null,busy:false,businessIds:undefined};
it('starts the customer reviews view while independent workspace data is still loading',()=>{
 expect(renderToStaticMarkup(React.createElement(LocalDashboardViews,props))).toContain('data-deferred-view');
});
it('keeps admin review loading behind the customer scope snapshot',()=>{
 expect(renderToStaticMarkup(React.createElement(LocalDashboardViews,{...props,admin:true}))).not.toContain('data-deferred-view');
 expect(renderToStaticMarkup(React.createElement(LocalDashboardViews,{...props,admin:true,data:{locations:[],listings:[],customers:[]} as any}))).toContain('data-deferred-view');
});
