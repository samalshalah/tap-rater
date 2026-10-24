import {describe,it,expect,vi,beforeEach,afterEach} from 'vitest';
const m=vi.hoisted(()=>({index:0,setters:[] as ReturnType<typeof vi.fn>[],router:{refresh:vi.fn(),push:vi.fn()}}));
vi.mock('next/navigation',()=>({useRouter:()=>m.router}));
vi.mock('react',async original=>({...await original<object>(),useEffect:vi.fn(),useState:(initial:unknown)=>{
 const i=m.index++;const setter=vi.fn();m.setters[i]=setter;
 const overrides:Record<number,unknown>={0:{locations:[],listings:[],licenses:{unlimited_locations:true,used:0,location_limit:1}},7:{name:'New Business',formattedAddress:'123 Main St'},9:true};
 return [i in overrides?overrides[i]:initial,setter];
}}));
import {CustomerLocations} from '@/components/account/customer-locations';
function findForm(node:any):any {if(!node)return null;if(Array.isArray(node))return node.map(findForm).find(Boolean);if(node.type==='form'&&node.props.onSubmit)return node;return findForm(node.props?.children);}
beforeEach(()=>{m.index=0;m.setters=[];vi.clearAllMocks();});afterEach(()=>vi.unstubAllGlobals());
it('opens the Google popup for exactly the newly created business',async()=>{
 const fetcher=vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({id:'new-location'}))).mockResolvedValueOnce(new Response(JSON.stringify({locations:[],listings:[]})));vi.stubGlobal('fetch',fetcher);
 const form=findForm(CustomerLocations({businesses:[]}));await form.props.onSubmit({preventDefault:vi.fn()});
 expect(m.setters[6]).toHaveBeenCalledWith({id:'new-location',name:'New Business',address:'123 Main St'});expect(m.setters[9]).toHaveBeenCalledWith(false);
 expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({action:'createLocation',name:'New Business'});
});
it('does not open a connection when adding is denied',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify({error:'No licence available'}),{status:403})));
 await findForm(CustomerLocations({businesses:[]})).props.onSubmit({preventDefault:vi.fn()});
 expect(m.setters[6]).not.toHaveBeenCalled();expect(m.setters[3]).toHaveBeenCalledWith('No licence available');
});
it('keeps a successful creation and its popup when refreshing the list fails',async()=>{
 const fetcher=vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({id:'created'}))).mockRejectedValueOnce(new Error('Network unavailable'));vi.stubGlobal('fetch',fetcher);
 await findForm(CustomerLocations({businesses:[]})).props.onSubmit({preventDefault:vi.fn()});
 expect(m.setters[6]).toHaveBeenCalledWith(expect.objectContaining({id:'created'}));expect(fetcher.mock.calls.filter(c=>c[1]?.method==='POST')).toHaveLength(1);
 expect(m.setters[3]).not.toHaveBeenCalledWith('Network unavailable');
});
