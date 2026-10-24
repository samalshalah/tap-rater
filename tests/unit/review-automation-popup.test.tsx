import {it,expect,vi,beforeEach,afterEach} from 'vitest';
const state=vi.hoisted(()=>({cursor:0,values:[] as any[],ref:{current:'one'}}));
vi.mock('react',async original=>({...await original<object>(),useRef:()=>state.ref,useState:(initial:unknown)=>{const i=state.cursor++;if(!(i in state.values))state.values[i]=initial;return [state.values[i],(v:unknown)=>{state.values[i]=v;}];}}));
import {ReviewAutomationControls,Toggle} from '@/components/account/review-automation-controls';
const workspace={business_id:'one',business_name:'Example business',ai_consent:true,auto_enabled:false,auto_four:false,auto_five:false,auto_style:'friendly',settings_version:8,reply_delay_minutes:360,draft_low_stars:false};
const location={id:'one',connected:true,...workspace};
const saved=vi.fn().mockResolvedValue(undefined);
function find(node:any,test:(n:any)=>boolean):any{if(!node)return null;if(Array.isArray(node))return node.map(n=>find(n,test)).find(Boolean);if(test(node))return node;return find(node.props?.children,test);}
function render(props=location){state.cursor=0;return ReviewAutomationControls({location:props,onSaved:saved});}
function text(node:any):string{if(node==null)return '';if(typeof node==='string'||typeof node==='number')return String(node);if(Array.isArray(node))return node.map(text).join(' ');return text(node.props?.children);}
let fetcher:ReturnType<typeof vi.fn>;
beforeEach(()=>{state.values=[];state.cursor=0;state.ref.current='one';saved.mockClear();fetcher=vi.fn().mockResolvedValue({ok:true,json:async()=>({workspaces:[workspace]})});vi.stubGlobal('fetch',fetcher);vi.stubGlobal('window',{confirm:vi.fn(()=>{throw Error('Native confirmation must not be used');})});});
afterEach(()=>vi.unstubAllGlobals());
it('groups the positive ratings and shows the latest delay in a website popup without changing settings',async()=>{
 let tree=render();expect(find(tree,n=>n.type===Toggle&&n.props.label==='5-star autopilot')).toBeFalsy();
 await find(tree,n=>n.type===Toggle&&n.props.label==='4–5-star autopilot').props.onChange();tree=render();
 expect(text(tree)).toContain('Enable 4–5-star autopilot?');expect(text(tree)).toContain('4–5 stars · 6 hours delay');
 expect(fetcher).toHaveBeenCalledTimes(1);expect(fetcher.mock.calls[0][1].method).toBeUndefined();
 find(tree,n=>n.type==='button'&&n.props.children==='Cancel').props.onClick();expect(text(render())).not.toContain('Enable 4–5-star autopilot?');expect(fetcher).toHaveBeenCalledTimes(1);
});
it('only enables both positive ratings after explicit website confirmation',async()=>{
 await find(render(),n=>n.type===Toggle&&n.props.label==='4–5-star autopilot').props.onChange();
 await find(render(),n=>n.type==='button'&&n.props.children==='Enable autopilot').props.onClick();
 const body=JSON.parse(fetcher.mock.calls[1][1].body);expect(body.action).toBe('settings');expect(body.settings).toMatchObject({businessId:'one',four:true,five:true,autoEnabled:true,lowStars:false,delayMinutes:360,version:8,confirmAutomaticPosting:true});expect(saved).toHaveBeenCalledOnce();
});
it('offers low-star drafts without enabling autopilot or publishing',async()=>{
 await find(render(),n=>n.type===Toggle&&n.props.label==='1–3-star drafts').props.onChange();const tree=render();
 expect(text(tree)).toContain('1–3 stars · Drafts only');expect(text(tree)).toContain('never published automatically');expect(text(tree)).not.toContain('6 hours delay');
 await find(tree,n=>n.type==='button'&&n.props.children==='Enable drafts').props.onClick();
 expect(JSON.parse(fetcher.mock.calls[1][1].body).settings).toMatchObject({autoEnabled:false,lowStars:true,confirmAutomaticPosting:false});
});
it('does not show another location’s pending confirmation after switching locations',async()=>{
 await find(render(),n=>n.type===Toggle&&n.props.label==='4–5-star autopilot').props.onChange();expect(text(render({...location,id:'two'}))).not.toContain('Enable 4–5-star autopilot?');expect(fetcher).toHaveBeenCalledTimes(1);
});
