import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect} from 'vitest';
import {HostedPageEditorToolbar} from '@/components/account/hosted-page-editor-toolbar';
import {HostedPagePreviewPanel} from '@/components/account/hosted-page-preview-panel';
import type {HostedPageEditorRecord} from '@/lib/hosted-page-editor-shared';
Object.assign(globalThis,{React});
const page:HostedPageEditorRecord={id:'fixture',customerId:'owner',customerEmail:'owner@example.test',businessId:'business',businessName:'Fixture',lifecycleStatus:'ACTIVE',code:'fixture',draft:{businessName:'Fixture',appearance:{theme:'light',accentColor:'#0f766e'},buttons:[]}};
const props={page,permanentUrl:'https://taprater.com/p/fixture',status:'idle' as const,message:'',isDirty:false,saveDraft:async()=>page,publish:async()=>{}};
describe('hosted page editor panels',()=>{
 it('preserves permanent link, copy, save and publish actions',()=>{const html=renderToStaticMarkup(React.createElement(HostedPageEditorToolbar,props));for(const text of ['https://taprater.com/p/fixture','Copy','Open','Save Draft','Publish','Draft saved'])expect(html).toContain(text);});
 it.each(['saving','publishing'] as const)('disables save and publish while %s',status=>{const html=renderToStaticMarkup(React.createElement(HostedPageEditorToolbar,{...props,status}));expect((html.match(/disabled=""/g)||[]).length).toBe(2);expect(html).toContain(status==='saving'?'Saving...':'Publishing...');});
 it('retains error and dirty-state precedence',()=>{const dirty=renderToStaticMarkup(React.createElement(HostedPageEditorToolbar,{...props,isDirty:true}));expect(dirty).toContain('Unsaved changes');const error=renderToStaticMarkup(React.createElement(HostedPageEditorToolbar,{...props,isDirty:true,status:'error',message:'Version conflict'}));expect(error).toContain('Version conflict');expect(error).toContain('text-red-700');expect(error).not.toContain('Unsaved changes');});
 it('keeps the preview iframe content, label, size and refresh action',()=>{const html=renderToStaticMarkup(React.createElement(HostedPagePreviewPanel,{previewHtml:'<h1>Updated preview</h1>',previewMessage:'',refreshPreview:async()=>{}}));for(const text of ['Hosted page draft preview','srcDoc="&lt;h1&gt;Updated preview&lt;/h1&gt;"','h-[560px]','Refresh'])expect(html).toContain(text);});
 it('retains the previous preview while displaying a preview error',()=>{const html=renderToStaticMarkup(React.createElement(HostedPagePreviewPanel,{previewHtml:'Previous preview',previewMessage:'Preview unavailable',refreshPreview:async()=>{}}));expect(html).toContain('Previous preview');expect(html).toContain('Preview unavailable');});
});
