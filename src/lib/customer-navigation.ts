export const customerNavigation = [
  {href:'/account',label:'Overview'},
  {href:'/account/reviews',label:'Reviews'},
  {href:'/account/profile',label:'Google Profile'},
  {href:'/account/heatmap',label:'Heat Map'},
  {href:'/account/local',label:'Directory Listings'},
  {href:'/account/reports',label:'Reports'},
  {href:'/account/notifications',label:'Issues & Approvals'},
  {href:'/account/stands',label:'My Stands'},
  {href:'/account/orders',label:'Orders & Billing'},
];

export function isNavigationActive(pathname: string, href: string) {
  return pathname === href || (href.startsWith("/account/") && pathname.startsWith(`${href}/`));
}
