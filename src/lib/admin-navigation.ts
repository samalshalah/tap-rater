export type AdminNavigationItem = {
  label: string;
  href: string;
  description: string;
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
      { label: "Orders", href: "/admin/orders", description: "Order management when checkout is enabled" },
      { label: "Customers", href: "/admin/customers", description: "Customer profiles and history" }
    ]
  },
  {
    label: "Commerce",
    items: [
      { label: "Products", href: "/admin/products", description: "Product records, prices, stock, and SEO" },
      { label: "Business Uses", href: "/admin/business-uses", description: "Shop by Use cards, landing pages, and assigned products" },
      { label: "Stand Types", href: "/admin/stand-types", description: "Shop categories, category content, buyer intent, and SEO" },
      { label: "Inventory", href: "/admin/inventory", description: "Stock levels, low-stock alerts, and SKUs" },
      { label: "Discounts", href: "/admin/discounts", description: "Coupons, bundle savings, and promotions" },
      { label: "Shipping", href: "/admin/shipping", description: "Shipping zones, rates, and fulfillment rules" },
      { label: "Taxes", href: "/admin/taxes", description: "Tax settings for checkout stage" }
    ]
  },
  {
    label: "Growth",
    items: [
      { label: "Website", href: "/admin/content", description: "Homepage, pages, and editable content" },
      { label: "Media", href: "/admin/media", description: "Images, product assets, and banners" },
      { label: "SEO", href: "/admin/seo", description: "Metadata, redirects, sitemap, and search snippets" },
      { label: "Analytics", href: "/admin/analytics", description: "Sales, traffic, conversion, and product reports" }
    ]
  },
  {
    label: "System",
    items: [
      { label: "Settings", href: "/admin/settings", description: "Store profile, admin, integrations, and launch checklist" },
      { label: "Email Templates", href: "/admin/settings/emails", description: "Order, request, and shipping notification copy" }
    ]
  }
];

export function getAdminNavigationItems(): AdminNavigationItem[] {
  return adminNavigationGroups.flatMap((group) => group.items);
}
