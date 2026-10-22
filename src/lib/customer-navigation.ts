export const customerNavigation = [
  { href: "/account", label: "Overview" },
  { href: "/account/stands", label: "My Stands" },
  { href: "/account/reviews", label: "Reviews" },
  { href: "/account/local", label: "Locations & Listings" },
  { href: "/account/heatmap", label: "Heat Map" },
  { href: "/account/orders", label: "Orders & Billing" },
];

export function isNavigationActive(pathname: string, href: string) {
  return pathname === href || (href.startsWith("/account/") && pathname.startsWith(`${href}/`));
}
