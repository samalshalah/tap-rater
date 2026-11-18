import {beforeEach,expect,it,vi} from 'vitest';
const m=vi.hoisted(()=>({index:0,removing:false,paused:false,active:true}));
vi.mock('next/navigation',()=>({useRouter:()=>({}),useSearchParams:()=>({get:()=>null})}));
const location=()=>({id:'qa',business_name:'QA business',plan_managed:true,plan_active:m.active,service_pause_available:true,google_assignment_exists:true,google_enabled:true,connected:true,service_paused:m.paused,review_count:0,settings_version:1});
vi.mock('react',async original=>({...await original<object>(),useEffect:vi.fn(),useMemo:(f:()=>unknown)=>f(),useState:(initial:unknown)=>{const i=m.index++;return [i===0?{locations:[location()],listings:[]}:i===12&&m.removing?location():initial,vi.fn()];}}));
import {CustomerLocations} from '@/components/account/customer-locations';
function find(n:any,p:(n:any)=>boolean):any{if(!n)return null;if(Array.isArray(n))return n.map(c=>find(c,p)).find(Boolean);return p(n)?n:find(n.props?.children,p);}
beforeEach(()=>{m.index=0;m.removing=false;m.paused=false;m.active=true;});
it.each([false,true])('keeps service controls icon-only with accessible hover labels, paused=%s',paused=>{
 m.paused=paused;const tree=CustomerLocations({businesses:[]});const label=paused?'Resume service':'Pause service';
 const button=find(tree,n=>n.type==='button'&&n.props.title===label);
 expect(button.props['aria-label']).toBe(`${label} for QA business`);expect(button.props.children.type).toBeTypeOf('object');
 expect(find(tree,n=>n.type==='button'&&n.props.title==='Delete location')).toBeTruthy();
});
it('keeps location deletion separate from subscription changes',()=>{
 m.removing=true;const tree=CustomerLocations({businesses:[]});
 expect(find(tree,n=>n.props?.href==='/account/packages')).toBeFalsy();
 expect(find(tree,n=>n.type==='button'&&n.props.children==='Delete location')).toBeTruthy();
});
it('keeps deletion confirmation available after service ends',()=>{
 m.removing=true;m.active=false;const tree=CustomerLocations({businesses:[]});
 expect(find(tree,n=>n.type==='button'&&n.props.children==='Delete location')).toBeTruthy();
});
