import { describe, expect, it } from "vitest";
import { adminNavigationGroups, getAdminNavigationItems } from "@/lib/admin-navigation";

describe("admin navigation", () => {
  it("contains professional ecommerce control areas", () => {
    const hrefs = getAdminNavigationItems().map((item) => item.href);

    expect(hrefs).toEqual(
      expect.arrayContaining([
        "/admin",
        "/admin/content",
        "/admin/products",
        "/admin/business-uses",
        "/admin/stand-types",
        "/admin/inventory",
        "/admin/orders",
        "/admin/customers",
        "/admin/requests",
        "/admin/media",
        "/admin/discounts",
        "/admin/shipping",
        "/admin/taxes",
        "/admin/seo",
        "/admin/analytics",
        "/admin/settings",
        "/admin/settings/emails"
      ])
    );
  });

  it("groups navigation into operations, commerce, growth, and settings", () => {
    expect(adminNavigationGroups.map((group) => group.label)).toEqual([
      "Operations",
      "Commerce",
      "Growth",
      "System"
    ]);
  });
});
