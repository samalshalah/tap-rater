export const reviewPerformancePath = '/account/reviews/overview';

export const customerNavigation = [
  {href:'/account',label:'Overview'},
  {href:reviewPerformancePath,label:'Performance'},
  {href:'/account/reviews',label:'Reviews'},
  {href:'/account/notifications',label:'Notifications'},
  {href:'/account/locations',label:'Manage Locations'},
  {href:'/account/stands',label:'My Stands'},
  {href:'/account/multilink',label:'Multi-Link'},
  {href:'/account/orders',label:'Orders & Billing'},
  {href:'/account/settings',label:'Account'},
];

export function isNavigationActive(pathname: string, href: string) {
  if(href==='/account/reviews'&&pathname===reviewPerformancePath)return false;
  if(href==='/account/stands'&&pathname==='/account/stands/overview')return false;
  return pathname === href || (href.startsWith("/account/") && pathname.startsWith(`${href}/`));
}

export function navigationForPurchases({service=false,stands=false,multilink=false}:{service?:boolean;stands?:boolean;multilink?:boolean}){
 return customerNavigation.filter(link=>{
  if(link.href==='/account/stands')return stands;
  if(link.href==='/account/multilink')return multilink;
  return !isLocationTool(link.href)||service;
 });
}

export function groupCustomerNavigation(links:typeof customerNavigation){
 const group=(href:string)=>href==='/account'?'overview':isLocationTool(href)?'reviews':href==='/account/stands'?'stands':href==='/account/multilink'?'multilink':'account';
 return ([['overview','Overview'],['reviews','Google Reviews'],['stands','Stands'],['multilink','Multi-Link'],['account','Account']] as const).map(([id,label])=>({id,label,links:links.filter(link=>group(link.href)===id)})).filter(section=>section.links.length);
}

export const locationTools=customerNavigation.filter(link=>[reviewPerformancePath,'/account/reviews','/account/notifications','/account/locations'].includes(link.href));
export function isLocationTool(href:string){return locationTools.some(tool=>tool.href===href);}
export function locationToolHref(href:string,id:string){return `${href}?location=${encodeURIComponent(id)}`;}
export function activeLocationId(requested:string|null,locations:{id:string}[]){return locations.some(l=>l.id===requested)?requested!:'';}
