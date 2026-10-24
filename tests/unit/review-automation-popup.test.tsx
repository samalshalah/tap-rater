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
it('saves the combined positive toggle in one click using the latest saved delay',async()=>{
 const tree=render();expect(find(tree,n=>n.type===Toggle&&n.props.label==='5-star autopilot')).toBeFalsy();
 await find(tree,n=>n.type===Toggle&&n.props.label==='4–5-star autopilot').props.onChange();
 expect(fetcher).toHaveBeenCalledTimes(2);
 const body=JSON.parse(fetcher.mock.calls[1][1].body);expect(body.action).toBe('settings');expect(body.settings).toMatchObject({businessId:'one',four:true,five:true,autoEnabled:true,lowStars:false,delayMinutes:360,version:8,confirmAutomaticPosting:true});
 expect(saved).toHaveBeenCalledOnce();expect(text(render())).not.toContain('Enable autopilot');expect(text(render())).not.toContain('hours delay');
});
it('turns low-star drafts on directly without enabling autopilot',async()=>{
 await find(render(),n=>n.type===Toggle&&n.props.label==='1–3-star drafts').props.onChange();
 expect(JSON.parse(fetcher.mock.calls[1][1].body).settings).toMatchObject({autoEnabled:false,lowStars:true,confirmAutomaticPosting:false});expect(saved).toHaveBeenCalledOnce();
});
it('shows save errors without reporting success or changing the switch',async()=>{
 fetcher.mockResolvedValueOnce({ok:true,json:async()=>({workspaces:[workspace]})}).mockResolvedValueOnce({ok:false,json:async()=>({error:'Settings changed. Please reload.'})});
 await find(render(),n=>n.type===Toggle&&n.props.label==='4–5-star autopilot').props.onChange();
 const tree=render();expect(text(tree)).toContain('Settings changed. Please reload.');expect(find(tree,n=>n.type===Toggle&&n.props.label==='4–5-star autopilot').props.on).toBe(false);expect(saved).not.toHaveBeenCalled();
});
it('does not save if the user switches location while settings are loading',async()=>{
 let resolve!:(value:unknown)=>void;fetcher.mockReturnValueOnce(new Promise(r=>{resolve=r;}));
 const change=find(render(),n=>n.type===Toggle&&n.props.label==='4–5-star autopilot').props.onChange();
 render({...location,id:'two'});resolve({ok:true,json:async()=>({workspaces:[workspace]})});await change;
 expect(fetcher).toHaveBeenCalledTimes(1);expect(saved).not.toHaveBeenCalled();
});
