import {expect,it} from 'vitest';
import {renderHostedPageHtml} from '@/lib/hosted-pages/render-html';
import {validateHostedPageEditorDraft} from '@/lib/hosted-page-editor-draft';
import {hostedPageBrandColors} from '@/lib/hosted-page-editor-shared';

const snapshot={schemaVersion:1 as const,code:'6Y2XVQS9QHKM',version:'v1',publishedAt:new Date().toISOString(),lifecycleStatus:'ACTIVE' as const,businessName:'Priority Toyota',buttons:[{id:'1',label:'Google Review',type:'review' as const,iconKey:'google_review' as const,url:'https://example.com',isVisible:true}],appearance:{theme:'light' as const,accentColor:'#eb0a1e'}};

it('draws light gray buttons outlined in the brand colour, never solid fills',()=>{
  const html=renderHostedPageHtml({state:'available',snapshot});
  expect(html).toContain('--accent: #eb0a1e');
  expect(html).toContain('--button-bg: #f4f5f7');
  expect(html).toMatch(/\.tr-button \{[^}]*background: var\(--button-bg\)[^}]*border: 1\.5px solid var\(--accent\)/);
  expect(html).not.toMatch(/\.tr-button \{[^}]*background: var\(--accent\)/);
});
it('accepts every car-brand colour and keeps older colours valid',()=>{
  for(const {value} of hostedPageBrandColors)expect(validateHostedPageEditorDraft({businessName:'Biz',buttons:[],appearance:{theme:'light',accentColor:value}}).appearance.accentColor).toBe(value);
  expect(validateHostedPageEditorDraft({businessName:'Biz',buttons:[],appearance:{theme:'light',accentColor:'#0f766e'}}).appearance.accentColor).toBe('#0f766e');
  expect(validateHostedPageEditorDraft({businessName:'Biz',buttons:[],appearance:{theme:'light'}}).appearance.accentColor).toBe('#6b7280');
  expect(hostedPageBrandColors.find(color=>color.label==='Toyota')?.value).toBe('#eb0a1e');
});
