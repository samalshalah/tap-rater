import {describe,expect,it} from 'vitest';
import {groupLicencesByBusiness} from '@/components/account/multilink-licences';
import {mergeButtonsByLabel} from '@/lib/hosted-page-insights';

const licence=(code:string,name:string,logoUrl?:string)=>({code,name,logoUrl,linkedStands:[],status:{label:'Live',tone:''}}) as never;

describe('groupLicencesByBusiness',()=>{
  it('puts locations with the same logo under one business, named by what they share',()=>{
    const groups=groupLicencesByBusiness([licence('A','Priority Toyota Chesapeake','/logo-t.png'),licence('B','Priority Honda','/logo-h.png'),licence('C','Priority Toyota Norfolk','/logo-t.png')]);
    expect(groups.map(g=>[g.name,g.licences.length])).toEqual([['Priority Toyota',2],['Priority Honda',1]]);
  });
  it('keeps pages without a logo apart',()=>{
    expect(groupLicencesByBusiness([licence('A','Shop'),licence('B','Shop')])).toHaveLength(2);
  });
});

describe('mergeButtonsByLabel',()=>{
  it('adds up the same link across locations',()=>{
    const merged=mergeButtonsByLabel([{buttonId:'a1',buttonType:'review',clicks:5},{buttonId:'b1',buttonType:'review',clicks:3},{buttonId:'a2',buttonType:'website',clicks:2},{buttonId:'forwarded',buttonType:'forward',clicks:1}],{a1:'Google Review',b1:'Google Review',a2:'Website'});
    expect(merged).toEqual([{buttonId:'label:Google Review',buttonType:'review',clicks:8},{buttonId:'label:Website',buttonType:'website',clicks:2},{buttonId:'forwarded',buttonType:'forward',clicks:1}]);
  });
});

import {renderToStaticMarkup} from 'react-dom/server';
import {createElement} from 'react';
import {MultiLinkLicences} from '@/components/account/multilink-licences';

describe('My Multi-Link page',()=>{
  it('shows one business header with Insights for all its locations',()=>{
    const full=(code:string,name:string,logoUrl:string)=>({code,name,logoUrl,plan:'$9.99/month',status:{label:'Live',tone:'is-success'},linkedStands:[],steps:[{label:'Add your links',detail:'',done:true},{label:'Publish the page',detail:'',done:true},{label:'Connect a stand',detail:'',done:false}],subscription:{id:code,hostedPageUrl:`https://taprater.com/p/${code}`,permanentCode:code,status:'active',lifecycleStatus:'ACTIVE',cancelAtPeriodEnd:false,billingProfileAvailable:false},editorStand:{},page:undefined}) as never;
    const html=renderToStaticMarkup(createElement(MultiLinkLicences,{licences:[full('AAAAAAAAAAAA','Priority Toyota Chesapeake','/t.png'),full('BBBBBBBBBBBB','Priority Toyota Norfolk','/t.png')]}));
    expect(html).toContain('Priority Toyota</h2>');
    expect(html).toContain('2 locations');
    expect(html).toContain('Insights for all locations');
  });
});
