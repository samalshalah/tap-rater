"use client";
import Link from 'next/link';
import {LayoutDashboard,MessageSquare,Building2,Map,Tablet,Link2,ShoppingBag,UserRound,Plus,Search} from 'lucide-react';
import {usePathname,useRouter,useSearchParams} from 'next/navigation';
import {useEffect,useState} from 'react';
import {customerNavigation,groupCustomerNavigation,isNavigationActive,locationTools,locationToolHref,activeLocationId} from '@/lib/customer-navigation';
import type {NavigationLocation} from '@/lib/customer-navigation-locations';
const icons:Record<string,typeof Building2>={'/account':LayoutDashboard,'/account/locations':Building2,'/account/stands/overview':LayoutDashboard,'/account/stands':Tablet,'/account/multilink':Link2,'/account/orders':ShoppingBag,'/account/settings':UserRound,'/account/profile':Building2,'/account/reviews':MessageSquare,'/account/heatmap':Map};
export function AccountNavigation({links,locations=[],locationsError=false}:{links:typeof customerNavigation;locations?:NavigationLocation[];locationsError?:boolean}){
 const pathname=usePathname(),router=useRouter(),params=useSearchParams();
 const selected=activeLocationId(params.get('location'),locations);
 const [query,setQuery]=useState('');
 useEffect(()=>{let refreshed=0;const refreshAccess=()=>{if(document.visibilityState==='visible'&&Date.now()-refreshed>15000){refreshed=Date.now();router.refresh();}};window.addEventListener('focus',refreshAccess);document.addEventListener('visibilitychange',refreshAccess);return()=>{window.removeEventListener('focus',refreshAccess);document.removeEventListener('visibilitychange',refreshAccess);};},[router]);
 const service=links.some(l=>l.href==='/account/locations');
 const showLocations=service&&(pathname==='/account/locations'||locationTools.some(t=>t.href===pathname)&&Boolean(selected));
 const targetTool=locationTools.some(t=>t.href===pathname)?pathname:'/account';
 const visible=locations.filter(l=>`${l.name} ${l.address}`.toLowerCase().includes(query.toLowerCase()));
 return <><aside className="tr-workspace-sidebar"><Link href="/account" className="tr-client-brand"><img src="/uploads-optimized/brand/tap-rater-logo-w320.webp" alt="Tap Rater" width="140" height="48"/></Link>
 <nav aria-label="Account navigation" className="tr-account-navigation grid gap-4">{groupCustomerNavigation(links).map(section=><section key={section.id} aria-label={section.label}><h2 className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wide text-muted">{section.label}</h2><div className="grid gap-1">{section.links.map(link=>{const Icon=icons[link.href]||Building2;
 if(link.href==='/account/locations')return <Link key={link.href} href={link.href} aria-current={pathname===link.href?'page':showLocations?'true':undefined} className="tr-workspace-nav-link"><Icon size={17} aria-hidden="true"/>{link.label}</Link>;
 const current=isNavigationActive(pathname,link.href)&&!(link.href==='/account'&&selected);
 return <Link key={link.href} href={link.href==='/account'&&service?'/account?location=':link.href} aria-current={current?'page':undefined} className="tr-workspace-nav-link"><Icon size={17} aria-hidden="true"/>{link.label}</Link>;
 })}</div></section>)}</nav><form action="/api/account/logout" method="post" className="mt-3"><button className="px-3 py-2 text-sm text-muted">Sign out</button></form></aside>
 {showLocations&&<aside className="tr-location-sidebar" aria-label="Location navigation"><header><h2>Locations</h2><Link href="/account/locations" className="tr-location-manage" aria-label="Manage locations" title="Add or manage locations"><Plus size={17}/></Link></header><label className="tr-tree-search"><Search size={15}/><input aria-label="Search your locations" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Find a business"/></label>
 <nav aria-label="Your businesses">{locationsError?<p role="alert" className="p-2 text-xs">Locations unavailable. <button className="underline" onClick={()=>router.refresh()}>Retry</button></p>:<ul>{visible.map(location=><li key={location.id} className={selected===location.id?'is-selected':''}><Link href={locationToolHref(targetTool,location.id)} className="tr-location-sidebar-business" aria-current={selected===location.id?'location':undefined} title={[location.name,location.address].filter(Boolean).join(' · ')}><Building2 size={17} aria-hidden="true"/><span><strong>{location.name}</strong><small>{location.address}</small></span></Link>{selected===location.id&&<ul className="tr-location-sidebar-tools">{locationTools.map(tool=>{const ToolIcon=icons[tool.href];return <li key={tool.href}><Link href={locationToolHref(tool.href,location.id)} aria-current={pathname===tool.href?'page':undefined}><ToolIcon size={15}/>{tool.label}</Link></li>;})}</ul>}</li>)}</ul>}{!locationsError&&!visible.length&&<p className="p-2 text-xs text-muted">{query?'No matching locations.':'No locations yet.'}</p>}</nav><Link href="/account/locations" className="tr-location-sidebar-footer">Manage locations</Link></aside>}</>;

}
