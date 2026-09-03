export type AdminNavigationItem = {
  label: string;
  href: string;
  description: string;
  status?: "operational" | "hidden";
};

export type AdminNavigationGroup = {
  label: string;
  items: AdminNavigationItem[];
};

export const adminNavigationGroups: AdminNavigationGroup[] = [
  {
    label: "Dashboard",
    items: [
      { label: "Dashboard", href: "/admin", description: "Daily order, production, and fulfillment overview" }
    ]
  },
  {
    label: "Commerce",
    items: [
      { label: "Orders", href: "/admin/orders", description: "Paid, pending, production, and shipping fulfillment" },
      { label: "Products", href: "/admin/products", description: "Sellable products, prices, assets, and production readiness" },
      { label: "Taxes", href: "/admin/taxes", description: "Manual checkout tax shown before Stripe" }
    ]
  },
  {
    label: "Operations",
    items: [
      { label: "Production Queue", href: "/admin/orders?filter=production", description: "Orders needing artwork, production, or review" },
      { label: "Shipping", href: "/admin/shipping", description: "Shipping mode, tracking, and fulfillment settings" },
      { label: "Requests", href: "/admin/requests", description: "Contact, setup, and link-change request queue" }
    ]
  },
  {
    label: "System",
    items: [
      { label: "Website", href: "/admin/content", description: "Controlled public website content, navigation, footer, and FAQs" },
      { label: "Business Uses", href: "/admin/business-uses", description: "Storefront use cases, imagery, SEO, and product relationships" },
      { label: "Email Templates", href: "/admin/settings/emails", description: "Order, request, and shipping notification copy" },
      { label: "Settings", href: "/admin/settings", description: "Store profile, admin, integrations, and launch checklist" }
    ]
  }
];

export const hiddenAdminNavigationItems: AdminNavigationItem[] = [
  { label: "Customers", href: "/admin/customers", description: "Future customer ownership and subscription support", status: "hidden" },
  { label: "Devices", href: "/admin/devices", description: "Legacy activation/device management retained off primary navigation", status: "hidden" },
  { label: "Stand Types", href: "/admin/stand-types", description: "Storefront taxonomy editor retained off primary navigation", status: "hidden" },
  { label: "Inventory", href: "/admin/inventory", description: "Unfinished inventory tooling hidden until operationally complete", status: "hidden" },
  { label: "Discounts", href: "/admin/discounts", description: "Unfinished discounts hidden until launch requirements demand it", status: "hidden" },
  { label: "Media", href: "/admin/media", description: "Media infrastructure remains available through product/order workflows", status: "hidden" },
  { label: "SEO", href: "/admin/seo", description: "SEO fields remain in product/taxonomy editors", status: "hidden" },
  { label: "Analytics", href: "/admin/analytics", description: "Analytics dashboard hidden because analytics is not core to the frozen product", status: "hidden" }
];

export function getAdminNavigationItems(): AdminNavigationItem[] {
  return adminNavigationGroups.flatMap((group) => group.items);
}

export function getHiddenAdminNavigationItems(): AdminNavigationItem[] {
  return hiddenAdminNavigationItems;
}
