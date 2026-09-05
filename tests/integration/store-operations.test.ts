import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createNeonSupabaseAdapterFromUrl } from "@/lib/neon-supabase-adapter";
import { saveProductContent, type CmsDbClient } from "@/lib/cms-repository";
import { createBlankAdminProduct, getAdminProductsFromClient } from "@/lib/admin-products";
import { getDefaultOptionsForProductKind } from "@/lib/catalog-architecture";
import { getStorefrontProductsFromClient } from "@/lib/product-repository";
import { getProductPurchaseOptions } from "@/lib/purchase-options";
import { buildStripeCheckoutLineItems, validateCheckoutCart } from "@/lib/checkout";
import { productContentSchema } from "@/lib/validators";

const url = process.env.PHASE1_DATABASE_URL;
const expectedHost = process.env.PHASE1_DATABASE_HOST;
const enabled = Boolean(url && expectedHost && process.env.PHASE1_ALLOW_DATABASE_WRITES === "yes");
if (enabled && (new URL(url!).hostname !== expectedHost || (process.env.DATABASE_URL && new URL(url!).hostname === new URL(process.env.DATABASE_URL).hostname))) throw new Error("Refusing non-isolated integration database");
const client = enabled ? createNeonSupabaseAdapterFromUrl(url!) : null;
const cmsClient = client as unknown as CmsDbClient;

describe.skipIf(!enabled)("store operations on isolated Postgres", () => {
  it("round-trips admin prices through the storefront and Stripe quantities, then pauses availability", async () => {
    const slug = `phase3-catalog-${randomUUID()}`;
    const input = productContentSchema.parse({ ...createBlankAdminProduct(), slug, sku: slug, title: "Phase 3 isolated catalog fixture",
      status: "active", isActive: true, assetReadinessStatus: "ready", assetSet: { standardAngledImageUrl: "/uploads/products/google-review-stand.png", brandedAngledImageUrl: "/uploads/products/google-review-stand.png", brandedFrontTemplateUrl: "/uploads/products/google-review-front-template.png" },
      productOptions: getDefaultOptionsForProductKind("normal_direct").map(option => ({ ...option, priceCents: option.optionCode === "standard_direct" ? 4200 : 5500 })) });
    try {
      await saveProductContent(cmsClient, input);
      const products = await getStorefrontProductsFromClient(client!);
      const product = products.find(product => product.slug === slug)!;
      expect(getProductPurchaseOptions(product).map(option => option.priceCents)).toEqual([4200, 5500]);
      const adminProduct = (await getAdminProductsFromClient(client!)).find(product => product.slug === slug)!;
      expect(adminProduct.purchaseOptions?.map(option => option.priceCents)).toEqual([4200, 5500]);
      const items = [{ productId: slug, optionId: "standard_direct" as const, quantity: 2, setup: { destinationUrl: "https://example.com/review", priceCents: 1 } }];
      const first = validateCheckoutCart(items, products);
      expect(first).toMatchObject({ ok: true, totalCents: 8400 });
      if (!first.ok) throw new Error(first.message);
      expect(buildStripeCheckoutLineItems(first.rows)[0]).toMatchObject({ quantity: 2, price_data: { unit_amount: 4200 } });
      input.productOptions[0].priceCents = 4600;
      await saveProductContent(cmsClient, input);
      expect(validateCheckoutCart(items, await getStorefrontProductsFromClient(client!))).toMatchObject({ ok: true, totalCents: 9200 });
      expect(first.rows[0].lineSubtotalCents).toBe(8400);

      input.stockStatus = "outofstock";
      await saveProductContent(cmsClient, input);
      expect(validateCheckoutCart(items, await getStorefrontProductsFromClient(client!))).toMatchObject({ ok: false });
      input.stockStatus = "instock";
      input.productOptions = input.productOptions.map(option => ({ ...option, isActive: false }));
      await saveProductContent(cmsClient, input);
      expect((await getStorefrontProductsFromClient(client!)).find(product => product.slug === slug)).toBeUndefined();
      const inactiveProduct = (await getAdminProductsFromClient(client!)).find(product => product.slug === slug)!;
      expect(inactiveProduct.purchaseOptions?.map(option => [option.isActive, option.priceCents])).toEqual([[false, 4600], [false, 5500]]);
    } finally {
      // Keep the fixture for inspection, but never leave it available to checkout.
      await client!.from("products").update({ is_active: false, status: "archived" }).eq("slug", slug);
    }
  }, 60_000);
});
