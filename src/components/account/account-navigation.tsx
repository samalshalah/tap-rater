"use client";
import Link from 'next/link';
import {LayoutDashboard,MessageSquare,Building2,Map,Tablet,Link2,ShoppingBag,UserRound,BarChart3,Bell,Globe,LogOut,Menu,X} from 'lucide-react';
import {usePathname,useRouter,useSearchParams} from 'next/navigation';
import {useEffect,useState,useTransition} from 'react';
import {customerNavigation,groupCustomerNavigation,isNavigationActive,locationTools,locationToolHref,activeLocationId} from '@/lib/customer-navigation';
import type {NavigationLocation} from '@/lib/customer-navigation-locations';
const icons:Record<string,typeof Building2>={'/account':LayoutDashboard,'/account/locations':Building2,'/account/stands/overview':LayoutDashboard,'/account/stands':Tablet,'/account/multilink':Link2,'/account/orders':ShoppingBag,'/account/settings':UserRound,'/account/profile':Building2,'/account/reviews':MessageSquare,'/account/heatmap':Map,'/account/business':Building2,'/account/local':Globe,'/account/reports':BarChart3,'/account/notifications':Bell};
export function AccountNavigation({links,locations=[]}:{links:typeof customerNavigation;locations?:NavigationLocation[];locationsError?:boolean}){
 const pathname=usePathname(),router=useRouter(),params=useSearchParams();
 const selected=activeLocationId(params.get('location'),locations);
 const [open,setOpen]=useState(false);
 useEffect(()=>setOpen(false),[pathname,selected]);
 useEffect(()=>{let refreshed=0;const refreshAccess=()=>{if(document.visibilityState==='visible'&&Date.now()-refreshed>15000){refreshed=Date.now();router.refresh();}};window.addEventListener('focus',refreshAccess);document.addEventListener('visibilitychange',refreshAccess);return()=>{window.removeEventListener('focus',refreshAccess);document.removeEventListener('visibilitychange',refreshAccess);};},[router]);
 const service=links.some(l=>l.href==='/account/locations');
 return <aside className="tr-workspace-sidebar" onKeyDown={e=>{if(e.key==='Escape')setOpen(false);}}>
  <a href="#workspace-content" className="tr-app-skip">Skip to content</a>
  <div className="tr-app-brand-row"><Link href={locationToolHref('/account',selected)} className="tr-client-brand"><img src="/uploads-optimized/brand/tap-rater-logo-w320.webp" alt="Tap Rater" width="140" height="48"/></Link><button type="button" className="tr-app-menu" aria-label={open?'Close navigation':'Open navigation'} aria-controls="workspace-navigation" aria-expanded={open} onClick={()=>setOpen(!open)}>{open?<X size={22}/>:<Menu size={22}/>}</button></div>
  <div id="workspace-navigation" className={'tr-app-navigation'+(open?' is-open':'')}>
  <nav aria-label="Account navigation" className="tr-account-navigation">
   {groupCustomerNavigation(links).map(section=>{
    const items=section.id==='reviews'&&service?[...locationTools,{href:'/account/locations',label:'Manage Locations'}]:section.id==='account'?[...section.links,{href:'/account/packages',label:'Packages'},{href:'/account/feedback',label:'Feedback'}]:section.links;
    return <section key={section.id} aria-label={section.id==='reviews'?'Local marketing':section.label}><h2>{section.id==='reviews'?'Local marketing':section.label}</h2><div>{items.map(link=>{
     const Icon=icons[link.href]||Building2;
     const scoped=service;
     const href=scoped?locationToolHref(link.href,selected):link.href;
     return <Link key={link.href} href={href} aria-current={isNavigationActive(pathname,link.href)?'page':undefined} className="tr-workspace-nav-link" onClick={()=>setOpen(false)}><Icon size={18} aria-hidden="true"/><span>{link.label}</span></Link>;
    })}</div></section>;
   })}
  </nav><form action="/api/account/logout" method="post"><button className="tr-app-signout"><LogOut size={17} aria-hidden="true"/>Sign out</button></form>
  </div>
 </aside>;
}
export function AccountContext({locations,enabled,locationsError=false}:{locations:NavigationLocation[];enabled:boolean;locationsError?:boolean}){
 const pathname=usePathname(),params=useSearchParams(),router=useRouter();
 const [pending,startTransition]=useTransition();
 const id=activeLocationId(params.get('location'),locations),selected=locations.find(l=>l.id===id);
 const scoped=locationTools.some(t=>t.href===pathname)||pathname==='/account/locations';
 return <header className="tr-app-context">
  {enabled&&scoped?<><div className="tr-app-context-picker"><Building2 size={18} aria-hidden="true"/><label><span>Workspace</span><select aria-label="Business location" value={id} disabled={pending||locationsError} onChange={e=>{const next=new URLSearchParams(params.toString());next.set('location',e.target.value);next.delete('view');startTransition(()=>router.push((pathname==='/account/locations'?'/account':pathname)+'?'+next.toString()));}}><option value="">All locations</option>{locations.map(l=><option value={l.id} key={l.id}>{l.name}{locations.filter(other=>other.name===l.name).length>1&&l.address?' · '+l.address:''}</option>)}</select></label></div><span className="tr-app-context-address" title={selected?.address}>{selected?.address||(!selected?`${locations.length} locations`:'')}</span>{pending&&<span role="status" className="tr-app-context-status">Switching…</span>}{locationsError&&<p role="alert">Locations unavailable. <button onClick={()=>router.refresh()}>Retry</button></p>}</>:<span className="tr-app-context-caption">Your account workspace</span>}
 </header>;
}
