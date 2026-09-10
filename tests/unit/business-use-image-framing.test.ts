import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HomepageBrowseCard } from "@/components/storefront/homepage-browse-card";
import { PageHero } from "@/components/storefront/section";
import { getBusinessUseImagePosition } from "@/lib/storefront-visuals";

const image = { src: "/uploads/use-cases/restaurants-cafes.webp", alt: "Menu and Order stand on a restaurant counter" };

describe("owner-supplied business-use image framing", () => {
  it("keeps the right-hand stands visible without changing unrelated images", () => {
    expect(getBusinessUseImagePosition(image.src)).toBe("right center");
    expect(getBusinessUseImagePosition("/uploads/use-cases/hotels-hospitality.webp")).toBe("85% center");
    expect(getBusinessUseImagePosition("/uploads/products/stand.png")).toBeUndefined();
    expect(getBusinessUseImagePosition("/uploads/owner-custom-photo.png")).toBeUndefined();
  });

  it("uses the same crop focus in desktop and mobile business cards", () => {
    const html = renderToStaticMarkup(createElement(HomepageBrowseCard, { href: "/solutions/restaurant-food", title: "Restaurants", description: "Menus and orders", image, variant: "use-case" }));
    expect(html.match(/object-position:right center/g)).toHaveLength(2);
    expect(html).toContain("aspect-[4/5]");
  });

  it("applies the focus to cropped solution heroes, not contained product images", () => {
    const cropped = renderToStaticMarkup(createElement(PageHero, { title: "Restaurants", image: { ...image, fit: "cover" } }));
    const contained = renderToStaticMarkup(createElement(PageHero, { title: "Restaurants", image: { ...image, fit: "contain" } }));
    expect(cropped).toContain("object-position:right center");
    expect(contained).not.toContain("object-position:");
  });
});
