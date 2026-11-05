"use client";
import {WorkspaceLink as Link} from './workspace-link';
import {LayoutDashboard,MessageSquare,Building2,Map,Tablet,Link2,ShoppingBag,UserRound,BarChart3,Bell,Globe,LogOut,Menu,X,ChevronDown} from 'lucide-react';
import {usePathname,useRouter,useSearchParams} from 'next/navigation';
import {useEffect,useRef,useState,useTransition} from 'react';
import {customerNavigation,groupCustomerNavigation,isNavigationActive,locationTools,locationToolHref,activeLocationId} from '@/lib/customer-navigation';
import type {NavigationLocation} from '@/lib/customer-navigation-locations';
const icons:Record<string,typeof Building2>={'/account':LayoutDashboard,'/account/locations':Building2,'/account/stands/overview':LayoutDashboard,'/account/stands':Tablet,'/account/multilink':Link2,'/account/orders':ShoppingBag,'/account/settings':UserRound,'/account/profile':Building2,'/account/reviews':MessageSquare,'/account/heatmap':Map,'/account/business':Building2,'/account/local':Globe,'/account/reports':BarChart3,'/account/notifications':Bell};
export function AccountNavigation({links,locations=[],managed}:{managed?:{base:string;section:string;location:string};links:typeof customerNavigation;locations?:NavigationLocation[];locationsError?:boolean}){
 const pathname=usePathname(),router=useRouter(),params=useSearchParams();
 const selected=activeLocationId(params.get('location'),locations);
 const [open,setOpen]=useState(false);
 useEffect(()=>setOpen(false),[pathname,selected]);
 useEffect(()=>{let refreshed=0;const refreshAccess=()=>{if(document.visibilityState==='visible'&&Date.now()-refreshed>15000){refreshed=Date.now();router.refresh();}};window.addEventListener('focus',refreshAccess);document.addEventListener('visibilitychange',refreshAccess);return()=>{window.removeEventListener('focus',refreshAccess);document.removeEventListener('visibilitychange',refreshAccess);};},[router]);
 const service=links.some(l=>l.href==='/account/locations');
 const sections:Record<string,string>={'/account':'Overview','/account/reviews':'Reviews','/account/notifications':'Notifications','/account/locations':'Overview','/account/stands':'My Stands','/account/multilink':'Multi-Link','/account/orders':'Orders & Billing','/account/packages':'Subscription'};
 const managedHref=(path:string)=>managed!.base+'?'+new URLSearchParams({section:sections[path],location:managed!.location});
 return <aside className="tr-workspace-sidebar" onKeyDown={e=>{if(e.key==='Escape')setOpen(false);}}>
  <a href="#workspace-content" className="tr-app-skip">Skip to content</a>
  <div className="tr-app-brand-row"><Link href={managed?managedHref('/account'):locationToolHref('/account',selected)} className="tr-client-brand"><img src="/uploads-optimized/brand/tap-rater-logo-w320.webp" alt="Tap Rater" width="140" height="48"/></Link><button type="button" className="tr-app-menu" aria-label={open?'Close navigation':'Open navigation'} aria-controls="workspace-navigation" aria-expanded={open} onClick={()=>setOpen(!open)}>{open?<X size={22}/>:<Menu size={22}/>}</button></div>
  <div id="workspace-navigation" className={'tr-app-navigation'+(open?' is-open':'')}>
  <nav aria-label="Account navigation" className="tr-account-navigation">
   {groupCustomerNavigation(links).map(section=>{
    const items=section.id==='reviews'&&service?[...locationTools,{href:'/account/locations',label:'Manage Locations'}]:section.id==='account'?[...section.links,...(service?[{href:'/account/packages',label:'Subscription'}]:[]),{href:'/account/feedback',label:'Feedback'}]:section.links;
    return <section key={section.id} aria-label={section.label}><h2>{section.label}</h2><div>{items.filter(link=>!managed||(sections[link.href]&&link.href!=='/account/locations')).map(link=>{
     const Icon=icons[link.href]||Building2;
     const scoped=service;
     const href=managed?managedHref(link.href):scoped?locationToolHref(link.href,selected):link.href;
     return <Link key={link.href} href={href} aria-current={(managed?sections[link.href]===managed.section:isNavigationActive(pathname,link.href))?'page':undefined} className="tr-workspace-nav-link" onClick={()=>setOpen(false)}><Icon size={18} aria-hidden="true"/><span>{link.label}</span></Link>;
    })}</div></section>;
   })}
  </nav>{managed?<Link className="tr-app-signout" href="/admin/customers">Return to admin</Link>:<form action="/api/account/logout" method="post"><button className="tr-app-signout"><LogOut size={17} aria-hidden="true"/>Sign out</button></form>}
  </div>
 </aside>;
}
export function AccountContext({locations,enabled,locationsError=false,adminDirectory}:{locations:NavigationLocation[];enabled:boolean;locationsError?:boolean;adminDirectory?:React.ReactNode}){
 const pathname=usePathname(),params=useSearchParams(),router=useRouter();
 const [pending,startTransition]=useTransition();
 const id=activeLocationId(params.get('location'),locations),selected=locations.find(l=>l.id===id);
 const [pickerOpen,setPickerOpen]=useState(false),pickerRef=useRef<HTMLDivElement>(null),optionRefs=useRef<(HTMLButtonElement|null)[]>([]);
 useEffect(()=>{if(!pickerOpen)return;const outside=(event:PointerEvent)=>{if(!pickerRef.current?.contains(event.target as Node))setPickerOpen(false);};const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){setPickerOpen(false);pickerRef.current?.querySelector<HTMLButtonElement>('.tr-app-context-trigger')?.focus();}};document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};},[pickerOpen]);
 const choices=[{id:'',name:'All locations',address:''},...locations.map(l=>({id:l.id,name:l.name,address:locations.filter(other=>other.name===l.name).length>1?l.address||'': ''}))];
 const currentLabel=selected?`${selected.name}${locations.filter(other=>other.name===selected.name).length>1&&selected.address?' · '+selected.address:''}`:'All locations';
 const choose=(nextId:string)=>{setPickerOpen(false);if(nextId===id)return;const next=new URLSearchParams(params.toString());if(nextId)next.set('location',nextId);else next.delete('location');next.delete('view');startTransition(()=>router.push(pathname+(next.size?'?'+next.toString():'')));};
 const scoped=locationTools.some(t=>t.href===pathname)||pathname==='/account/locations';
 return <header className="tr-app-context">
  {adminDirectory}
  {enabled&&scoped?<><div className="tr-app-context-picker" ref={pickerRef}><Building2 size={18} aria-hidden="true"/><div className="tr-app-context-select-wrap"><span className="tr-app-context-label">Workspace</span><button type="button" className="tr-app-context-trigger" aria-label="Business location" aria-haspopup="listbox" aria-expanded={pickerOpen} disabled={pending||locationsError} onClick={()=>setPickerOpen(value=>!value)} onKeyDown={event=>{if(event.key==='ArrowDown'){event.preventDefault();setPickerOpen(true);requestAnimationFrame(()=>optionRefs.current[Math.max(0,choices.findIndex(choice=>choice.id===id))]?.focus());}}}><span>{currentLabel}</span><ChevronDown size={16} aria-hidden="true"/></button>{pickerOpen&&<div className="tr-app-context-options" role="listbox" aria-label="Choose business location">{choices.map((choice,index)=><button type="button" role="option" aria-selected={choice.id===id} key={choice.id||'all'} ref={node=>{optionRefs.current[index]=node;}} onClick={()=>choose(choice.id)} onKeyDown={event=>{if(event.key==='ArrowDown'||event.key==='ArrowUp'){event.preventDefault();const direction=event.key==='ArrowDown'?1:-1;optionRefs.current[(index+direction+choices.length)%choices.length]?.focus();}else if(event.key==='Home'){event.preventDefault();optionRefs.current[0]?.focus();}else if(event.key==='End'){event.preventDefault();optionRefs.current[choices.length-1]?.focus();}else if(event.key==='Enter'||event.key===' '){event.preventDefault();choose(choice.id);}}}><span>{choice.name}</span>{choice.address&&<small>{choice.address}</small>}{choice.id===id&&<span className="tr-app-context-check" aria-hidden="true">✓</span>}</button>)}</div>}</div></div><span className="tr-app-context-address" title={selected?.address}>{selected?.address||(!selected?`${locations.length} review location${locations.length===1?'':'s'}`:'')}</span>{pending&&<span role="status" className="tr-app-context-status">Switching…</span>}{locationsError&&<p role="alert">Locations unavailable. <button onClick={()=>router.refresh()}>Retry</button></p>}</>:<span className="tr-app-context-caption">Your account workspace</span>}
 </header>;
}
