import {describe,expect,it} from 'vitest';
import {buildInitialDraft,readHostedPageText} from '@/lib/hosted-provisioning-model';
import type {OrderLineItem} from '@/lib/order-types';

const item=(setup:Record<string,unknown>)=>({productId:'rate-your-experience-stand',setup} as unknown as OrderLineItem);

describe('readHostedPageText',()=>{
  it('uses the title and text the customer typed',()=>{
    expect(readHostedPageText(item({multiLinkTextSet:true,multiLinkTitle:'Tell us how we did',multiLinkDescription:'Pick a site'}),'Priority Toyota',true))
      .toEqual({headline:'Tell us how we did',description:'Pick a site'});
  });
  it('leaves both empty when the customer cleared them',()=>{
    expect(readHostedPageText(item({multiLinkTextSet:true}),'Priority Toyota',true)).toEqual({headline:'Priority Toyota',description:undefined});
  });
  it('keeps the old behaviour for orders made before the text boxes',()=>{
    expect(readHostedPageText(item({}),'Priority Toyota',true).description).toBe('Choose an option below.');
    expect(readHostedPageText(item({}),'Priority Toyota',false).description).toBe('This Tap Rater page is being set up.');
  });
});

describe('buildInitialDraft',()=>{
  it('uses the standard line unless told otherwise',()=>{
    expect(buildInitialDraft('Shop').description).toBe('This Tap Rater page is being set up.');
    expect(buildInitialDraft('Shop',undefined,[],'Title','Custom line').description).toBe('Custom line');
    expect(buildInitialDraft('Shop',undefined,[],'Title',null).description).toBeUndefined();
  });
});

import {renderHostedPageHtml} from '@/lib/hosted-pages/render-html';
const page=(extra:Record<string,unknown>)=>({schemaVersion:1 as const,code:'6Y2XVQS9QHKM',version:'v1',publishedAt:new Date().toISOString(),lifecycleStatus:'ACTIVE' as const,businessName:'Priority Toyota',buttons:[{id:'1',label:'Google Review',type:'review' as const,iconKey:'google_review' as const,url:'https://example.com',isVisible:true}],...extra});
const body=(extra:Record<string,unknown>)=>renderHostedPageHtml({state:'available',snapshot:page(extra) as never}).split('<body')[1];

describe('business name on the page',()=>{
  it('shows the name above a custom title by default',()=>{
    const html=body({headline:'Rate Your Experience'});
    expect(html).toContain('<p class="tr-business">Priority Toyota</p>');
    expect(html).toContain('<h1>Rate Your Experience</h1>');
  });
  it('leaves the name out when the customer hid it',()=>{
    const html=body({headline:'Rate Your Experience',showBusinessName:false});
    expect(html).not.toContain('tr-business');
    expect(html).toContain('<h1>Rate Your Experience</h1>');
  });
  it('shows no heading at all when the name is hidden and there is no title',()=>{
    expect(body({headline:'Priority Toyota',showBusinessName:false})).not.toContain('<h1>');
  });
  it('carries the choice from the order',()=>{
    expect(readHostedPageText(item({multiLinkTextSet:true,multiLinkShowBusinessName:false}),'Priority Toyota',true).showBusinessName).toBe(false);
    expect(readHostedPageText(item({multiLinkTextSet:true}),'Priority Toyota',true).showBusinessName).toBeUndefined();
  });
});
