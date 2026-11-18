import {beforeEach,afterEach,it,expect,vi} from 'vitest';
const m=vi.hoisted(()=>({index:0,existing:'owned-location',progress:{completed:null,business_id:null,businesses:[{id:'owned-location',business_name:'My stand location',address:'123 Main Street'}]},router:{replace:vi.fn(),refresh:vi.fn()}}));
vi.mock('next/navigation',()=>({useRouter:()=>m.router}));
vi.mock('react',async original=>({...await original<object>(),useEffect:vi.fn(),useRef:(current:unknown)=>({current}),useState:(initial:unknown)=>{
 const index=m.index++;const overrides:Record<number,unknown>={1:m.existing,2:m.progress};return [index in overrides?overrides[index]:initial,vi.fn()];
}}));
import {FirstLoginSetup} from '@/components/account/first-login-setup';
function find(node:any,predicate:(node:any)=>boolean):any {if(!node)return null;if(Array.isArray(node))return node.map(child=>find(child,predicate)).find(Boolean);if(predicate(node))return node;return find(node.props?.children,predicate);}
beforeEach(()=>{vi.clearAllMocks();m.index=0;m.existing='owned-location';m.progress={completed:null,business_id:null,businesses:[{id:'owned-location',business_name:'My stand location',address:'123 Main Street'}]};});afterEach(()=>vi.unstubAllGlobals());
it('lets a stand owner continue with their existing location without a Places search or device code',async()=>{
 const fetcher=vi.fn().mockResolvedValue(new Response(JSON.stringify({business_id:'owned-location'})));vi.stubGlobal('fetch',fetcher);
 const tree=FirstLoginSetup({children:null});
 expect(find(tree,node=>node.type==='option'&&node.props.value==='owned-location')).toBeTruthy();
 const next=find(tree,node=>node.type==='button'&&node.props.children==='Next');expect(next.props.disabled).toBe(false);await next.props.onClick();
 expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({action:'chooseExisting',businessId:'owned-location'});
});
it('requires a new business selection when no existing location is chosen',()=>{
 m.existing='';const tree=FirstLoginSetup({children:null});expect(find(tree,node=>node.type==='button'&&node.props.children==='Next').props.disabled).toBe(true);
});

it('starts a fresh customer at business setup',()=>{
 const tree=FirstLoginSetup({children:null});
 expect(find(tree,node=>node.type==='h1').props.children).toBe('Set up your business');
});
it.each([
 {preview:{id:'preview',name:'Saved business',address:'123 Main Street'}},
 {business_id:'saved',connected:false},
 {business_id:'saved',connected:true,synced_at:null},
 {business_id:'saved',connected:true,synced_at:'2026-11-18',drafts_only:true}
])('resumes saved customer progress without starting over: %j',patch=>{
 Object.assign(m.progress,patch);
 const tree=FirstLoginSetup({children:null});
 expect(find(tree,node=>node.type==='h1').props.children).toBe('Continue your setup');
 if(patch.drafts_only){
  expect(find(tree,node=>node.type==='p'&&node.props.children==='Edit and copy your drafts, then publish them on Google yourself. Automatic posting is not included.')).toBeTruthy();
  expect(find(tree,node=>node.type==='button'&&node.props.children==='Open Reviews')).toBeTruthy();
 }
});
it('leaves completed customers on their existing workspace',()=>{
 Object.assign(m.progress,{completed:'2026-11-18'});
 const child='Existing workspace';
 expect(FirstLoginSetup({children:child}).props.children).toBe(child);
});
