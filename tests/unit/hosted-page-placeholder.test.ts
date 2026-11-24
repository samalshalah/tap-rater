import {describe,expect,it,vi} from 'vitest';
import {ensureHostedPagePlaceholder,retireHostedPage} from '@/lib/hosted-pages/placeholder';
import {readCurrentHostedPageSnapshot,type HostedPageTextStorage} from '@/lib/hosted-pages/repository';
import {renderHostedPageHtml,resolveHostedPageLifecycle} from '@/lib/hosted-pages/snapshots';

function memoryStorage(){
  const files=new Map<string,string>();
  const storage:HostedPageTextStorage={
    getText:async key=>files.get(key)??null,
    putText:async (key,value)=>{files.set(key,value);},
    putTextIfAbsent:async (key,value)=>{if(files.has(key))return false;files.set(key,value);return true;}
  };
  return {files,storage};
}
const input={code:'6Y2XVQS9QHKM',physicalProductRef:'page-1',assignedBy:'admin-multilink-grant',businessName:'Priority Toyota Chesapeake',headline:'Rate Your Experience'};

describe('permanent link placeholder',()=>{
  it('makes a new link live with a being-set-up page',async()=>{
    const {storage}=memoryStorage();
    expect(await ensureHostedPagePlaceholder(storage,input)).toBe('published');
    const snapshot=await readCurrentHostedPageSnapshot(storage,input.code);
    expect(snapshot).toMatchObject({businessName:'Priority Toyota Chesapeake',headline:'Rate Your Experience',buttons:[]});
    const html=renderHostedPageHtml(resolveHostedPageLifecycle(snapshot!));
    expect(html).toContain('being set up');
    expect(html).toContain('Rate Your Experience');
  });
  it('never replaces a page that is already live',async()=>{
    const {storage}=memoryStorage();
    await ensureHostedPagePlaceholder(storage,input);
    const first=await readCurrentHostedPageSnapshot(storage,input.code);
    const put=vi.spyOn(storage,'putText');
    expect(await ensureHostedPagePlaceholder(storage,{...input,businessName:'Other'})).toBe('already_live');
    expect(put).not.toHaveBeenCalled();
    expect((await readCurrentHostedPageSnapshot(storage,input.code))?.version).toBe(first?.version);
  });
  it('accepts a code already assigned under another reference',async()=>{
    const {storage}=memoryStorage();
    await storage.putText(`hosted-pages/${input.code}/assignment.json`,JSON.stringify({code:input.code,physicalProductRef:'stripe-checkout:x:order:y:line:1',assignedAt:new Date().toISOString()}));
    expect(await ensureHostedPagePlaceholder(storage,input)).toBe('published');
  });
});

describe('retiring a removed page',()=>{
  it('replaces the live page with a not-active page',async()=>{
    const {storage}=memoryStorage();
    await ensureHostedPagePlaceholder(storage,input);
    expect(await retireHostedPage(storage,input.code)).toBe('retired');
    const snapshot=await readCurrentHostedPageSnapshot(storage,input.code);
    expect(snapshot?.lifecycleStatus).toBe('RETIRED_INTERNAL');
    const html=renderHostedPageHtml(resolveHostedPageLifecycle(snapshot!));
    expect(html).toContain('not active');
    expect(await retireHostedPage(storage,input.code)).toBe('already_retired');
  });
  it('does nothing when the page was never published',async()=>{
    const {storage}=memoryStorage();
    expect(await retireHostedPage(storage,input.code)).toBe('nothing_published');
  });
});
