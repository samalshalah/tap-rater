export type AdminNavigationItem = {
  label: string;
  href: string;
  description: string;
  status?: "operational" | "draft";
};

export type AdminNavigationGroup = {
  label: string;
  items: AdminNavigationItem[];
};

export const adminNavigationGroups: AdminNavigationGroup[] = [
  {
    label: "Operations",
    items: [
      { label: "Dashboard", href: "/admin", description: "Store overview and daily actions" },
      { label: "Requests", href: "/admin/requests", description: "Setup, contact, and link-change queue" },
      { label: "Devices", href: "/admin/devices", description: "NFC/QR devices, activation codes, redirects, and tap counts" },
      { label: "Orders", href: "/admin/orders", description: "Paid, pending, production, and shipping fulfillment" }
    ]
  },
  {
    label: "Commerce",
    items: [
      { label: "Products", href: "/admin/products", description: "Product records, prices, stock, and SEO" },
      { label: "Business Uses", href: "/admin/business-uses", description: "Shop by Use cards, landing pages, and assigned products" },
      { label: "Stand Types", href: "/admin/stand-types", description: "Shop categories, category content, buyer intent, and SEO" },
      { label: "Shipping", href: "/admin/shipping", description: "Shipping mode, handling text, regions, and fulfillment notes" }
    ]
  },
  {
    label: "System",
    items: [
      { label: "Email Templates", href: "/admin/settings/emails", description: "Order, request, and shipping notification copy" },
      { label: "Settings", href: "/admin/settings", description: "Store profile, admin, integrations, and launch checklist" }
    ]
  },
  {
    label: "Future / Draft tools",
    items: [
      { label: "Customers", href: "/admin/customers", description: "Coming soon: customer profiles and history", status: "draft" },
      { label: "Inventory", href: "/admin/inventory", description: "Coming soon: stock levels, alerts, and inventory activity", status: "draft" },
      { label: "Discounts", href: "/admin/discounts", description: "Coming soon: coupons, bundles, and promotions", status: "draft" },
      { label: "Taxes", href: "/admin/taxes", description: "Coming soon: tax settings for a later checkout phase", status: "draft" },
      { label: "Website", href: "/admin/content", description: "Draft tool: CMS editing is not part of daily Phase 1 operations", status: "draft" },
      { label: "Media", href: "/admin/media", description: "Draft tool: use product editor uploads for product assets today", status: "draft" },
      { label: "SEO", href: "/admin/seo", description: "Draft tool: SEO fields live in product, use, and stand-type editors today", status: "draft" },
      { label: "Analytics", href: "/admin/analytics", description: "Draft tool: reporting is not operational for launch yet", status: "draft" }
    ]
  }
];

export function getAdminNavigationItems(): AdminNavigationItem[] {
  return adminNavigationGroups.flatMap((group) => group.items);
}
