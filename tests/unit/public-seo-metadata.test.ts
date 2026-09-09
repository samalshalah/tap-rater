import { existsSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { catalogCategories, migratedProducts } from "@/data/migrated-products";
import { getCategoryHref } from "@/lib/category-routes";
import { defaultSocialImage } from "@/lib/social-metadata";
import sitemap from "@/app/sitemap";
import { metadata as rootMetadata } from "@/app/layout";
import { metadata as homeMetadata } from "@/app/page";
import CategoryPage, { generateMetadata as categoryMetadata } from "@/app/category/[slug]/page";
import { generateMetadata as solutionMetadata } from "@/app/solutions/[slug]/page";
import { generateMetadata as productMetadata } from "@/app/product/[slug]/page";

const mocks = vi.hoisted(() => ({
  products: vi.fn(), product: vi.fn(), businessUses: vi.fn(), businessUse: vi.fn(), standType: vi.fn()
}));
vi.mock("@/components/layout/site-shell", () => ({ SiteShell: () => null }));
vi.mock("@/lib/product-repository", () => ({
  getStorefrontProducts: mocks.products,
  getStorefrontProductBySlug: mocks.product,
  getStorefrontProductsByCategory: mocks.products,
  getRelatedStorefrontProductsForProduct: mocks.products
}));
vi.mock("@/lib/admin-business-uses", () => ({
  getPublicBusinessUses: mocks.businessUses, getPublicBusinessUseBySlug: mocks.businessUse
}));
vi.mock("@/lib/admin-stand-types", () => ({ getPublicStandTypeBySlug: mocks.standType, getPublicStandTypes: vi.fn() }));
vi.mock("next/navigation", () => ({
  permanentRedirect: (path: string) => { throw new Error(`REDIRECT:${path}`); },
  notFound: () => { throw new Error("NOT_FOUND"); },
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => "/"
}));

const params = (slug: string) => ({ params: Promise.resolve({ slug }) });
const googleStand = migratedProducts.find((product) => product.slug === "google-review-stand")!;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.products.mockResolvedValue([googleStand]);
  mocks.product.mockResolvedValue(googleStand);
  mocks.businessUses.mockResolvedValue([{ slug: "restaurants" }]);
  mocks.businessUse.mockResolvedValue({ slug: "restaurants", title: "Restaurants", description: "Restaurant stands" });
  mocks.standType.mockResolvedValue(undefined);
});

describe("canonical public category URLs", () => {
  it.each(catalogCategories)("keeps $slug lookup consistent with the public URL", (category) => {
    const path = getCategoryHref(category.slug);
    expect(path).toBe(category.slug === "website-links" ? "/category/website-link-stands" : `/category/${category.slug}`);
  });

  it("publishes the canonical Multi-Link category once and keeps products and business uses", async () => {
    const entries = await sitemap();
    const paths = entries.map((entry) => new URL(entry.url).pathname);
    expect(paths.filter((path) => path === "/category/website-link-stands")).toHaveLength(1);
    expect(paths).not.toContain("/category/website-links");
    expect(paths).toContain("/product/google-review-stand");
    expect(paths).toContain("/solutions/restaurants");
    expect(paths).toContain("/multi-link");
    expect(entries.every((entry) => entry.lastModified === undefined)).toBe(true);
  });

  it.each(["website-links", "website-link-stands", "link-stands"])("uses the same canonical metadata for %s", async (slug) => {
    const metadata = await categoryMetadata(params(slug));
    expect(metadata.alternates?.canonical).toBe("/category/website-link-stands");
    expect(metadata.openGraph).toMatchObject({ url: "/category/website-link-stands" });
  });

  it("permanently redirects the old sitemap category before loading products", async () => {
    await expect(CategoryPage(params("website-links"))).rejects.toThrow("REDIRECT:/category/website-link-stands");
    expect(mocks.products).not.toHaveBeenCalled();
  });
});

describe("social preview image coverage", () => {
  it("provides a real shared fallback for root and overriding homepage metadata", () => {
    expect(rootMetadata.openGraph).toMatchObject({ images: [defaultSocialImage] });
    expect(homeMetadata.openGraph).toMatchObject({ images: [defaultSocialImage] });
    expect(existsSync(`public${defaultSocialImage.url}`)).toBe(true);
    // Let Next derive the image from each page's Open Graph data, not a root Twitter image.
    expect(rootMetadata.twitter).toEqual({ card: "summary_large_image" });
  });

  it.each(catalogCategories)("provides an existing fallback image for $slug", async (category) => {
    const metadata = await categoryMetadata(params(category.slug));
    const images = metadata.openGraph?.images as Array<{ url: string; alt: string }>;
    expect(images).toHaveLength(1);
    expect(images[0].alt).toBeTruthy();
    expect(existsSync(`public${images[0].url}`)).toBe(true);
  });

  it.each([
    { bannerImageUrl: "https://cdn.example.com/banner.jpg", imageUrl: "/uploads/detail.jpg", expected: "https://cdn.example.com/banner.jpg" },
    { imageUrl: "/api/media/category-image", expected: "/api/media/category-image" }
  ])("honors category admin media $expected", async ({ expected, ...media }) => {
    mocks.standType.mockResolvedValue({ title: "Configured category", ...media });
    expect((await categoryMetadata(params("reviews"))).openGraph).toMatchObject({
      images: [{ url: expected, alt: "Configured category" }]
    });
  });

  it("uses the site fallback when business-use media is absent", async () => {
    expect((await solutionMetadata(params("restaurants"))).openGraph).toMatchObject({ images: [defaultSocialImage] });
  });

  it.each([
    { bannerImageUrl: "/uploads/banner.jpg", imageUrl: "/uploads/detail.jpg", expected: "/uploads/banner.jpg" },
    { imageUrl: "https://cdn.example.com/restaurant.jpg", expected: "https://cdn.example.com/restaurant.jpg" }
  ])("uses configured business-use media $expected", async ({ expected, ...media }) => {
    mocks.businessUse.mockResolvedValue({ slug: "restaurants", title: "Restaurants", ...media });
    expect((await solutionMetadata(params("restaurants"))).openGraph).toMatchObject({ images: [{ url: expected, alt: "Restaurants" }] });
  });

  it("preserves product-specific images instead of replacing them with the shared image", async () => {
    const metadata = await productMetadata(params("google-review-stand"));
    const images = metadata.openGraph?.images as Array<{ url: string }>;
    expect(images).toHaveLength(googleStand.images.length);
    expect(new URL(images[0].url).pathname).toBe(googleStand.images[0].src);
  });

  it("provides a fallback for a product without gallery media", async () => {
    mocks.product.mockResolvedValue({ ...googleStand, images: [] });
    expect((await productMetadata(params("google-review-stand"))).openGraph).toMatchObject({ images: [defaultSocialImage] });
  });

  it("preserves not-found metadata for absent records", async () => {
    mocks.businessUse.mockResolvedValue(undefined);
    mocks.product.mockResolvedValue(undefined);
    expect(await solutionMetadata(params("missing"))).toEqual({ title: "Business Use Not Found" });
    expect(await productMetadata(params("missing"))).toEqual({ title: "Product Not Found" });
    expect(await categoryMetadata(params("missing"))).toEqual({ title: "Category Not Found" });
  });
});
