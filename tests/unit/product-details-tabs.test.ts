import { createElement, Fragment } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProductDetailsTabs } from "@/components/product/product-details-tabs";

const props = {
  highlights: [{ title: "Tap or scan", body: "Opens your destination." }],
  howItWorks: [{ step: 1, title: "Tap", body: "Hold your phone near the stand." }],
  specifications: [{ label: "Size", value: "5 x 7 inches" }],
  includedItems: [{ label: "Programmed NFC" }],
  standardPrice: "$39",
  brandedPrice: "$49"
};

describe("product information navigation", () => {
  it("renders all three full section names in the mobile selector", () => {
    const html = renderToStaticMarkup(createElement(ProductDetailsTabs, props));

    expect(html).toContain('class="md:hidden"');
    expect(html).toContain('>Product information</label>');
    expect(html).toContain('<option value="details" selected="">Product details</option>');
    expect(html).toContain('<option value="specifications">Specifications</option>');
    expect(html).not.toContain('<option value="compare">');
    expect(html).toContain('<option value="how">How it works</option>');
    expect(html).not.toContain("overflow-x-auto");
  });

  it("links each desktop tab to a mounted panel with only the initial panel shown", () => {
    const html = renderToStaticMarkup(createElement(ProductDetailsTabs, props));

    expect(html).toContain('role="tablist" aria-label="Product information"');
    expect(html.match(/role="tab"/g)).toHaveLength(3);
    expect(html.match(/role="tabpanel"/g)).toHaveLength(3);
    expect(html.match(/aria-selected="true"/g)).toHaveLength(1);
    expect(html.match(/aria-selected="false"/g)).toHaveLength(2);
    expect(html.match(/tabindex="-1"/g)).toHaveLength(2);
    expect(html.match(/hidden=""/g)).toHaveLength(2);

    for (const match of html.matchAll(/aria-controls="([^"]+)"/g)) {
      expect(html).toContain(`id="${match[1]}"`);
    }
    for (const match of html.matchAll(/aria-labelledby="([^"]+)"/g)) {
      expect(html).toContain(`id="${match[1]}"`);
    }
  });

  it("keeps product content and prices available in the corresponding panels", () => {
    const html = renderToStaticMarkup(createElement(ProductDetailsTabs, props));

    for (const content of ["Tap or scan", "Opens your destination.", "5 x 7 inches", "Programmed NFC", "Tap: Hold your phone near the stand."]) {
      expect(html).toContain(content);
    }
  });

  it("omits the specifications section when no specifications or included items exist", () => {
    const html = renderToStaticMarkup(createElement(ProductDetailsTabs, { ...props, specifications: [], includedItems: [] }));

    expect(html).not.toContain('<option value="specifications">');
    expect(html).not.toContain('-tab-specifications');
    expect(html).not.toContain('-panel-specifications');
    expect(html.match(/role="tab"/g)).toHaveLength(2);
    expect(html.match(/role="tabpanel"/g)).toHaveLength(2);
  });

  it("removes the obsolete comparison panel", () => {
    const html = renderToStaticMarkup(createElement(ProductDetailsTabs, props));
    expect(html).not.toContain("Standard vs.");
    expect(html).not.toContain("$39");
    expect(html).toContain("How it works");
  });

  it("does not offer hosting in the comparison for an incompatible product", () => {
    const html = renderToStaticMarkup(createElement(ProductDetailsTabs, props));
    expect(html).not.toContain("Optional hosted Multi-Link adds");
  });

  it.each([
    { specifications: props.specifications, includedItems: [] },
    { specifications: [], includedItems: props.includedItems }
  ])("keeps specifications available when either type of content exists", (content) => {
    const html = renderToStaticMarkup(createElement(ProductDetailsTabs, { ...props, ...content }));

    expect(html).toContain('<option value="specifications">Specifications</option>');
    expect(html).toContain('-panel-specifications');
  });

  it("does not share control or panel IDs between component instances", () => {
    const html = renderToStaticMarkup(createElement(Fragment, null,
      createElement(ProductDetailsTabs, props),
      createElement(ProductDetailsTabs, props)
    ));
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);

    expect(ids).toHaveLength(14);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
