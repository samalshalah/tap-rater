import { describe, expect, it, vi } from "vitest";
import { createBlankBusinessUse, getAdminBusinessUsesFromClient, saveBusinessUseContent } from "@/lib/admin-business-uses";

describe("admin business uses", () => {
  it("creates a blank draft for the create form", () => {
    expect(createBlankBusinessUse()).toMatchObject({
      slug: "",
      title: "",
      isActive: false,
      productSlugs: []
    });
  });

  it("loads business uses with assigned products", async () => {
    const client = {
      from(table: string) {
        return {
          select() {
            return {
              order() {
                if (table === "business_uses") {
                  return Promise.resolve({
                    data: [
                      {
                        slug: "restaurant-food",
                        title: "Restaurant / Food",
                        description: "Restaurants",
                        short_description: "Restaurant stands",
                        long_content: "Long copy",
                        image_url: "/use.webp",
                        banner_image_url: "/banner.webp",
                        sort_order: 20,
                        is_active: true
                      }
                    ],
                    error: null
                  });
                }

                return Promise.resolve({
                  data: [
                    { product_slug: "view-menu-stand", business_use_slug: "restaurant-food", sort_order: 10 },
                    { product_slug: "google-review-stand", business_use_slug: "restaurant-food", sort_order: 20 }
                  ],
                  error: null
                });
              }
            };
          }
        };
      }
    };

    await expect(getAdminBusinessUsesFromClient(client)).resolves.toEqual([
      expect.objectContaining({
        slug: "restaurant-food",
        shortDescription: "Restaurant stands",
        productSlugs: ["view-menu-stand", "google-review-stand"]
      })
    ]);
  });

  it("blocks existing slug changes and replaces assigned products on save", async () => {
    const calls: string[] = [];
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const insert = vi.fn().mockResolvedValue({ error: null });
    const deleteEq = vi.fn().mockResolvedValue({ error: null });
    const client = {
      from(table: string) {
        calls.push(table);
        return {
          upsert,
          insert,
          delete: () => ({ eq: deleteEq })
        };
      }
    };

    await expect(
      saveBusinessUseContent(client, {
        originalSlug: "restaurant-food",
        slug: "restaurants",
        title: "Restaurants",
        description: "",
        shortDescription: "",
        longContent: "",
        sortOrder: 10,
        isActive: true,
        productSlugs: []
      })
    ).rejects.toThrow("slugs cannot be changed");

    await saveBusinessUseContent(client, {
      originalSlug: "restaurant-food",
      slug: "restaurant-food",
      title: "Restaurant / Food",
      description: "",
      shortDescription: "",
      longContent: "",
      sortOrder: 20,
      isActive: true,
      productSlugs: ["view-menu-stand"]
    });

    expect(calls).toContain("business_uses");
    expect(deleteEq).toHaveBeenCalledWith("business_use_slug", "restaurant-food");
    expect(insert).toHaveBeenCalledWith([
      { product_slug: "view-menu-stand", business_use_slug: "restaurant-food", sort_order: 10 }
    ]);
  });
});
