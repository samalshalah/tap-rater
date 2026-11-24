import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect,it} from 'vitest';
import {HostedPageLinksFields} from '@/components/account/hosted-page-links-fields';
import type {HostedPageEditorButton,HostedPageEditorDraft} from '@/lib/hosted-page-editor-shared';

const button=(id:string,type:HostedPageEditorButton['type'],label:string):HostedPageEditorButton=>({id,type,label,url:'',enabled:true,position:Number(id)});
const draft:HostedPageEditorDraft={businessName:'Priority Toyota Chesapeake',appearance:{theme:'light',accentColor:'#0f766e'},buttons:[button('0','google_review','Google Review'),button('1','cars_com','Cars.com'),button('2','website','Website')]};
const noop=()=>{};
const html=renderToStaticMarkup(createElement(HostedPageLinksFields,{draft,orderedButtons:draft.buttons,showLinkChoices:false,setShowLinkChoices:noop,addButton:noop,updateButton:noop,moveButton:noop,removeButton:noop}));

it('only asks for a name on generic links',()=>{
  expect(html.match(/aria-label="Link name"/g)).toHaveLength(1);
  expect(html).toContain('value="Website"');
});
it('offers Google Business search for the Google link',()=>{
  expect(html).toContain('Find on Google');
});
it('offers a site search for dealer review sites',()=>{
  expect(html).toContain('https://www.google.com/search?q=%22Priority%20Toyota%20Chesapeake%22%20site%3Acars.com');
});
