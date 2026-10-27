import {it,expect,vi,beforeEach,afterEach} from 'vitest';
const m=vi.hoisted(()=>({index:0,done:false,error:'',complete:false,checking:true,saved:50,progress:50,effects:[] as (()=>unknown)[],setters:[] as ReturnType<typeof vi.fn>[],refs:[] as {current:unknown}[]}));
vi.mock('react',async original=>({...await original<object>(),useMemo:(factory:()=>unknown)=>factory(),useCallback:(callback:unknown)=>callback,useEffect:(effect:()=>unknown)=>m.effects.push(effect),useRef:(initial:unknown)=>{const ref={current:initial};m.refs.push(ref);return ref;},useState:(initial:unknown)=>{const i=m.index++;m.setters[i]=vi.fn();return [i===1?{id:'one',name:'Just Chill DC',done:m.done}:i===3?{workspaces:[{business_id:'one',business_name:'Just Chill DC',enabled:true,connected:true,synced_at:null,next_page:null,review_total:189,initial_import_completed:m.complete,sync_in_progress:m.checking,saved_count:m.saved,imported_count:m.progress,reviews:[]}]}:i===4?m.error:initial,m.setters[i]];}}));
import {GoogleLiveReviews} from '@/components/account/google-live-reviews';
function find(node:any,predicate:(n:any)=>boolean):any{if(!node)return null;if(Array.isArray(node))return node.map(n=>find(n,predicate)).find(Boolean);if(predicate(node))return node;return find(node.props?.children,predicate);}
beforeEach(()=>{m.index=0;m.done=false;m.error='';m.complete=false;m.checking=true;m.saved=50;m.progress=50;m.effects=[];m.setters=[];m.refs=[];});afterEach(()=>vi.unstubAllGlobals());
it('shows compact progress without opening a dialog or interrupting imports',()=>{
 const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);const tree=GoogleLiveReviews({businessId:'one'});
 expect(find(tree,n=>n.props?.labelledBy==='location-import-title')).toBeFalsy();
 expect(find(tree,n=>n.props?.['aria-label']==='Close import progress')).toBeFalsy();
 const status=find(tree,n=>n.props?.role==='status'&&n.props?.['aria-live']==='polite');
 expect(status).toBeTruthy();
 expect(find(status,n=>n.type==='span'&&n.props.className?.includes('animate-spin'))).toBeTruthy();
 const label=find(status,n=>n.type==='span'&&typeof n.props.children==='string');
 expect(label.props.children).toBe('Importing · 50 / 189 reviews · 26%');
 expect(fetcher).not.toHaveBeenCalled();
 expect(m.refs[0].current).toBe(true);
});
it('does not show import details belonging to a different selected location',()=>{
 const tree=GoogleLiveReviews({businessId:'another'});
 expect(find(tree,n=>n.props?.role==='status'&&n.props?.['aria-live']==='polite')).toBeFalsy();
});
it.each([{done:true,error:'',label:'Imported'},{done:false,error:'Import failed',label:'Import paused'}])('stops the spinner when $label',({done,error,label})=>{
 m.done=done;m.checking=!done;m.error=error;
 const tree=GoogleLiveReviews({businessId:'one'});
 const status=find(tree,n=>n.props?.role==='status'&&n.props?.['aria-live']==='polite');
 expect(find(status,n=>n.type==='span'&&n.props.className?.includes('animate-spin'))).toBeFalsy();
 expect(find(status,n=>n.type==='span'&&typeof n.props.children==='string').props.children).toBe(done?'50 reviews saved':'Import paused · 50 / 189 reviews');
});

it('keeps the saved count while a later cycle is still checking older reviews',()=>{
 m.complete=true;m.saved=723;m.progress=200;
 const tree=GoogleLiveReviews({businessId:'one'});
 const status=find(tree,n=>n.props?.role==='status'&&n.props?.['aria-live']==='polite');
 expect(find(status,n=>n.type==='span'&&typeof n.props.children==='string').props.children).toBe('723 reviews saved · Checking for updates');
});
it('does not start a browser import for an already imported workspace',()=>{
 m.complete=true;const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);
 GoogleLiveReviews({businessId:'one'});
 m.effects[1]();
 expect(fetcher).not.toHaveBeenCalled();
});
