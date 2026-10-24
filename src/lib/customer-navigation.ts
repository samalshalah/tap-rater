export const customerNavigation = [
  {href:'/account',label:'Overview'},
  {href:'/account/reviews',label:'Reviews'},
  {href:'/account/profile',label:'Google Profile'},
  {href:'/account/heatmap',label:'Heat Map'},
  {href:'/account/local',label:'Directory Listings'},
  {href:'/account/reports',label:'Reports'},
  {href:'/account/notifications',label:'Issues & Approvals'},
  {href:'/account/stands',label:'My Stands'},
  {href:'/account/multilink',label:'Multi-Link'},
  {href:'/account/orders',label:'Orders & Billing'},
  {href:'/account/settings',label:'Account'},
];

export function isNavigationActive(pathname: string, href: string) {
  return pathname === href || (href.startsWith("/account/") && pathname.startsWith(`${href}/`));
}

export function navigationForPurchases({service=false,stands=false,multilink=false}:{service?:boolean;stands?:boolean;multilink?:boolean}){
 return customerNavigation.filter(link=>link.href==='/account'||link.href==='/account/orders'||link.href==='/account/settings'||(link.href==='/account/multilink'?multilink:link.href==='/account/stands'?stands:service));
}
