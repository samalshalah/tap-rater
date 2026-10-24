export const customerNavigation = [
  {href:'/account',label:'Overview'},
  {href:'/account/reviews',label:'Reviews'},
  {href:'/account/profile',label:'Google Profile'},
  {href:'/account/heatmap',label:'Heat Map'},
  {href:'/account/local',label:'Directory Listings'},
  {href:'/account/reports',label:'Reports'},
  {href:'/account/notifications',label:'Issues & Approvals'},
  {href:'/account/stands/overview',label:'Overview'},
  {href:'/account/stands',label:'My Stands'},
  {href:'/account/multilink',label:'Multi-Link'},
  {href:'/account/orders',label:'Orders & Billing'},
  {href:'/account/settings',label:'Account'},
];

export function isNavigationActive(pathname: string, href: string) {
  if(href==='/account/stands'&&pathname==='/account/stands/overview')return false;
  return pathname === href || (href.startsWith("/account/") && pathname.startsWith(`${href}/`));
}

export function navigationForPurchases({service=false,stands=false,multilink=false}:{service?:boolean;stands?:boolean;multilink?:boolean}){
 return customerNavigation.filter(link=>link.href==='/account'||link.href==='/account/orders'||link.href==='/account/settings'||(link.href==='/account/stands/overview'?service&&stands:link.href==='/account/multilink'?multilink:link.href==='/account/stands'?stands:service));
}

export function groupCustomerNavigation(links:typeof customerNavigation){
 const service=links.some(link=>link.href==='/account/reviews');
 const group=(href:string)=>href==='/account/orders'||href==='/account/settings'?'account':href==='/account/stands'||href==='/account/stands/overview'||href==='/account/multilink'||(href==='/account'&&!service)?'stands':'reviews';
 return ([['reviews','Google Reviews'],['stands','Stands'],['account','Account']] as const).map(([id,label])=>({id,label,links:links.filter(link=>group(link.href)===id)})).filter(section=>section.links.length);
}
