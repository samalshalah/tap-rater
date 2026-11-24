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
