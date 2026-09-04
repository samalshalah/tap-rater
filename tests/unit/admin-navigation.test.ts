import { describe, expect, it } from "vitest";
import { adminNavigationGroups, getAdminNavigationItems, getHiddenAdminNavigationItems } from "@/lib/admin-navigation";

describe("admin navigation", () => {
  it("exposes only intentional operational areas in primary navigation", () => {
    const hrefs = getAdminNavigationItems().map((item) => item.href);

    expect(hrefs).toEqual(
      expect.arrayContaining([
        "/admin",
        "/admin/products",
        "/admin/inventory",
        "/admin/customers",
        "/admin/orders",
        "/admin/orders?filter=production",
        "/admin/requests",
        "/admin/shipping",
        "/admin/taxes",
        "/admin/content",
        "/admin/business-uses",
        "/admin/settings",
        "/admin/settings/emails"
      ])
    );

    expect(hrefs).not.toEqual(
      expect.arrayContaining([
        "/admin/stand-types",
        "/admin/devices",
        "/admin/discounts",
        "/admin/media",
        "/admin/seo",
        "/admin/analytics"
      ])
    );
  });

  it("keeps hidden draft and future routes cataloged but off primary navigation", () => {
    const hiddenItems = getHiddenAdminNavigationItems();

    expect(hiddenItems.map((item) => item.href)).toEqual(
      expect.arrayContaining([
        "/admin/devices",
        "/admin/stand-types",
        "/admin/discounts",
        "/admin/media",
        "/admin/seo",
        "/admin/analytics"
      ])
    );
    expect(hiddenItems.every((item) => item.status === "hidden")).toBe(true);
  });

  it("groups navigation into dashboard, commerce, operations, and system", () => {
    expect(adminNavigationGroups.map((group) => group.label)).toEqual([
      "Dashboard",
      "Commerce",
      "Operations",
      "System"
    ]);
  });
});
