import {it,expect,vi,beforeEach,afterEach} from 'vitest';
const m=vi.hoisted(()=>({index:0,done:false,error:'',setters:[] as ReturnType<typeof vi.fn>[],refs:[] as {current:unknown}[]}));
vi.mock('react',async original=>({...await original<object>(),useEffect:vi.fn(),useRef:(initial:unknown)=>{const ref={current:initial};m.refs.push(ref);return ref;},useState:(initial:unknown)=>{const i=m.index++;m.setters[i]=vi.fn();return [i===1?{id:'one',name:'Just Chill DC',done:m.done}:i===3?{workspaces:[{business_id:'one',business_name:'Just Chill DC',enabled:true,connected:true,synced_at:null,next_page:null,review_total:189,imported_count:50,reviews:[]}]}:i===4?m.error:initial,m.setters[i]];}}));
import {GoogleLiveReviews} from '@/components/account/google-live-reviews';
function find(node:any,predicate:(n:any)=>boolean):any{if(!node)return null;if(Array.isArray(node))return node.map(n=>find(n,predicate)).find(Boolean);if(predicate(node))return node;return find(node.props?.children,predicate);}
beforeEach(()=>{m.index=0;m.done=false;m.error='';m.setters=[];m.refs=[];});afterEach(()=>vi.unstubAllGlobals());
it('shows compact progress without opening a dialog or interrupting imports',()=>{
 const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);const tree=GoogleLiveReviews({businessId:'one'});
 expect(find(tree,n=>n.props?.labelledBy==='location-import-title')).toBeFalsy();
 expect(find(tree,n=>n.props?.['aria-label']==='Close import progress')).toBeFalsy();
 const status=find(tree,n=>n.props?.role==='status'&&n.props?.['aria-live']==='polite');
 expect(status).toBeTruthy();
 expect(find(status,n=>n.type==='span'&&n.props.className?.includes('animate-spin'))).toBeTruthy();
 const label=find(status,n=>n.type==='span'&&Array.isArray(n.props.children));
 expect(label.props.children.flat().join('')).toBe('Importing · 50 / 189 reviews · 26%');
 expect(fetcher).not.toHaveBeenCalled();
 expect(m.refs[0].current).toBe(true);
});
it('does not show import details belonging to a different selected location',()=>{
 const tree=GoogleLiveReviews({businessId:'another'});
 expect(find(tree,n=>n.props?.role==='status'&&n.props?.['aria-live']==='polite')).toBeFalsy();
});
it.each([{done:true,error:'',label:'Imported'},{done:false,error:'Import failed',label:'Import paused'}])('stops the spinner when $label',({done,error,label})=>{
 m.done=done;m.error=error;
 const tree=GoogleLiveReviews({businessId:'one'});
 const status=find(tree,n=>n.props?.role==='status'&&n.props?.['aria-live']==='polite');
 expect(find(status,n=>n.type==='span'&&n.props.className?.includes('animate-spin'))).toBeFalsy();
 expect(find(status,n=>n.type==='span'&&Array.isArray(n.props.children)).props.children.flat().join('')).toBe(`${label} · 50 / 189 reviews`);
});
