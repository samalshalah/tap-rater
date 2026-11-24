import {expect,it} from 'vitest';
import {buildSnapshotFromDraft} from '@/lib/hosted-page-editor-draft';
import type {HostedPageEditorRecord} from '@/lib/hosted-page-editor-shared';

it('branded links show the brand name even if an old custom name was saved',()=>{
  const page={id:'p',customerId:'c',customerEmail:'e',businessId:'b',businessName:'Biz',code:'6Y2XVQS9QHKM',lifecycleStatus:'ACTIVE',draft:{businessName:'Biz',appearance:{theme:'light',accentColor:'#0f766e'},buttons:[
    {id:'1',type:'google_review',label:'Goog',url:'https://search.google.com/local/writereview?placeid=abc',enabled:true,position:0},
    {id:'2',type:'website',label:'Our inventory',url:'https://example.com/inventory',enabled:true,position:1},
    {id:'3',type:'cars_com',label:'',url:'https://www.cars.com/dealers/1/',enabled:true,position:2}
  ]}} as HostedPageEditorRecord;
  expect(buildSnapshotFromDraft(page).buttons.map(button=>button.label)).toEqual(['Google Review','Our inventory','Cars.com']);
});
