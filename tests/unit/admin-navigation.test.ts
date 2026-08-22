import { describe, expect, it } from "vitest";
import { adminNavigationGroups, getAdminNavigationItems } from "@/lib/admin-navigation";

describe("admin navigation", () => {
  it("keeps launch operations separate from future draft tools", () => {
    const hrefs = getAdminNavigationItems().map((item) => item.href);

    expect(hrefs).toEqual(
      expect.arrayContaining([
        "/admin",
        "/admin/products",
        "/admin/business-uses",
        "/admin/stand-types",
        "/admin/orders",
        "/admin/requests",
        "/admin/shipping",
        "/admin/settings",
        "/admin/settings/emails"
      ])
    );

    const draftItems = getAdminNavigationItems().filter((item) => item.status === "draft");

    expect(draftItems.map((item) => item.href)).toEqual(
      expect.arrayContaining([
        "/admin/customers",
        "/admin/inventory",
        "/admin/discounts",
        "/admin/taxes",
        "/admin/content",
        "/admin/media",
        "/admin/seo",
        "/admin/analytics"
      ])
    );
    expect(draftItems.every((item) => item.description.toLowerCase().includes("coming soon") || item.description.toLowerCase().includes("draft tool"))).toBe(true);
  });

  it("groups navigation into operations, commerce, system, and future draft tools", () => {
    expect(adminNavigationGroups.map((group) => group.label)).toEqual([
      "Operations",
      "Commerce",
      "System",
      "Future / Draft tools"
    ]);
  });
});
