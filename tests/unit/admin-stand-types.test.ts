import { describe, expect, it, vi } from "vitest";
import { createBlankStandType, getAdminStandTypesFromClient, saveStandTypeContent } from "@/lib/admin-stand-types";

describe("admin stand types", () => {
  it("creates a blank draft for future-safe editor defaults", () => {
    expect(createBlankStandType()).toMatchObject({
      slug: "",
      title: "",
      buyerIntent: "",
      isActive: false
    });
  });

  it("loads editable stand type content fields", async () => {
    const client = {
      from() {
        return {
          select() {
            return {
              order() {
                return Promise.resolve({
                  data: [
                    {
                      slug: "menu-info-stands",
                      title: "Menu & Info Stands",
                      description: "Menus",
                      short_description: "Menu stands",
                      long_content: "Landing copy",
                      buyer_intent: "For menu visits",
                      seo_title: "Menu Stands",
                      seo_description: "Shop menu stands",
                      image_url: "/menu.png",
                      banner_image_url: "/menu-banner.png",
                      sort_order: 50,
                      is_active: true
                    }
                  ],
                  error: null
                });
              }
            };
          }
        };
      }
    };

    await expect(getAdminStandTypesFromClient(client)).resolves.toEqual([
      expect.objectContaining({
        slug: "menu-info-stands",
        shortDescription: "Menu stands",
        buyerIntent: "For menu visits",
        bannerImageUrl: "/menu-banner.png"
      })
    ]);
  });

  it("blocks existing slug changes and upserts editable content", async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const client = { from: () => ({ upsert }) };

    await expect(
      saveStandTypeContent(client, {
        originalSlug: "menu-info-stands",
        slug: "menu-stands",
        title: "Menu Stands",
        description: "",
        shortDescription: "",
        longContent: "",
        buyerIntent: "",
        sortOrder: 50,
        isActive: true
      })
    ).rejects.toThrow("slugs cannot be changed");

    await saveStandTypeContent(client, {
      originalSlug: "menu-info-stands",
      slug: "menu-info-stands",
      title: "Menu & Info Stands",
      description: "",
      shortDescription: "Menu stands",
      longContent: "Landing copy",
      buyerIntent: "Menu visitors",
      sortOrder: 50,
      isActive: true
    });

    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({
      slug: "menu-info-stands",
      short_description: "Menu stands",
      buyer_intent: "Menu visitors"
    }), { onConflict: "slug" });
  });
});
