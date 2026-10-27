import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
Object.assign(globalThis,{React});
const m=vi.hoisted(()=>({effects:[] as Array<()=>void>,fetch:vi.fn()}));
vi.mock('react',async original=>({...await original<typeof import('react')>(),useEffect:(effect:()=>void)=>{m.effects.push(effect);}}));
vi.mock('next/navigation',()=>({useRouter:()=>({push:vi.fn()}),useSearchParams:()=>new URLSearchParams()}));
vi.mock('@/components/account/local-dashboard-views',()=>({LocalDashboardViews:({data}:{data:unknown})=>data?<p>Workspace ready</p>:null}));
vi.mock('@/components/account/local-location-controls',()=>({LocalLocationControls:()=>null,LocalLocationForm:()=>null}));
import {LocalDashboard} from '@/components/account/local-dashboard';
const snapshot={locations:[],listings:[],customers:[]};
beforeEach(()=>{m.effects=[];m.fetch.mockReset().mockResolvedValue({ok:true,json:async()=>snapshot});vi.stubGlobal('fetch',m.fetch);});
afterEach(()=>vi.unstubAllGlobals());
it('renders workspace in the server HTML and skips the redundant initial fetch',()=>{
 const html=renderToStaticMarkup(<LocalDashboard initialSnapshot={snapshot}/>);
 expect(html).toContain('Workspace ready');expect(html).not.toContain('Loading your workspace');
 m.effects.at(-1)!();expect(m.fetch).not.toHaveBeenCalled();
});
it.each([false,true])('retains client loading for fallback and admin (admin=%s)',async admin=>{
 const html=renderToStaticMarkup(<LocalDashboard admin={admin} initialSnapshot={admin?snapshot:null}/>);
 expect(html).toContain('Loading your workspace');
 m.effects.at(-1)!();
 expect(m.fetch).toHaveBeenCalledWith(admin?'/api/admin/local':'/api/account/local',{cache:'no-store'});
 await Promise.resolve();
});
