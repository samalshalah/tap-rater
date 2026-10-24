import {it,expect,vi,beforeEach,afterEach} from 'vitest';
const m=vi.hoisted(()=>({index:0,setters:[] as ReturnType<typeof vi.fn>[],refs:[] as {current:unknown}[]}));
vi.mock('react',async original=>({...await original<object>(),useEffect:vi.fn(),useRef:(initial:unknown)=>{const ref={current:initial};m.refs.push(ref);return ref;},useState:(initial:unknown)=>{const i=m.index++;m.setters[i]=vi.fn();return [i===1?{id:'one',name:'Just Chill DC',done:false}:i===3?{workspaces:[{business_id:'one',business_name:'Just Chill DC',enabled:true,connected:true,synced_at:null,next_page:null,review_total:189,imported_count:50,reviews:[]}]}:initial,m.setters[i]];}}));
import {GoogleLiveReviews} from '@/components/account/google-live-reviews';
function find(node:any,predicate:(n:any)=>boolean):any{if(!node)return null;if(Array.isArray(node))return node.map(n=>find(n,predicate)).find(Boolean);if(predicate(node))return node;return find(node.props?.children,predicate);}
beforeEach(()=>{m.index=0;m.setters=[];m.refs=[];});afterEach(()=>vi.unstubAllGlobals());
it('closing progress hides the popup without cancelling the import',()=>{
 const fetcher=vi.fn();vi.stubGlobal('fetch',fetcher);const tree=GoogleLiveReviews({businessId:'one'});
 m.refs[1].current=true;
 find(tree,n=>n.props?.['aria-label']==='Close import progress').props.onClick();
 expect(m.setters[1]).toHaveBeenCalledWith(null);expect(m.refs[0].current).toBe(true);expect(m.refs[1].current).toBe(true);expect(fetcher).not.toHaveBeenCalled();
});
it('explains background continuation and uses the selected business count for progress',()=>{
 const tree=GoogleLiveReviews({businessId:'one'});
 expect(find(tree,n=>n.type==='p'&&n.props.children==='You can close this popup. Your reviews will continue importing in the background.')).toBeTruthy();
 expect(find(tree,n=>n.props?.role==='progressbar').props['aria-valuenow']).toBe(26);
});
