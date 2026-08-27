import { describe, expect, it } from "vitest";

// @ts-expect-error The production sync command is an executable ESM script without generated declarations.
const syncProductsScript = await import("../../scripts/sync-products.mjs");

const {
  FIELD_OWNERSHIP_POLICY,
  createCatalogReconciliationPlan,
  formatReconciliationPlan,
  getFillIfEmptyAssetUpdates,
  parseSyncProductArgs
} = syncProductsScript;

describe("sync-products safety script", () => {
  it("defaults to read-only dry-run mode", () => {
    expect(parseSyncProductArgs([])).toMatchObject({
      mode: "dry-run",
      apply: false,
      allowWrites: false
    });
  });

  it("requires a second explicit confirmation for write mode", () => {
    expect(parseSyncProductArgs(["--apply"])).toMatchObject({
      mode: "dry-run",
      apply: true,
      allowWrites: false
    });
    expect(parseSyncProductArgs(["--apply", "--confirm-fill-empty-assets"])).toMatchObject({
      mode: "safe-fill-empty-assets",
      apply: true,
      allowWrites: true
    });
  });

  it("documents admin-owned fields separately from system-owned fields", () => {
    expect(FIELD_OWNERSHIP_POLICY.adminOwned).toContain("title");
    expect(FIELD_OWNERSHIP_POLICY.adminOwned).toContain("base_price_cents");
    expect(FIELD_OWNERSHIP_POLICY.adminOwned).toContain("images");
    expect(FIELD_OWNERSHIP_POLICY.systemOwned).toContain("checkout_mode");
    expect(FIELD_OWNERSHIP_POLICY.systemOwned).toContain("requires_subscription");
    expect(FIELD_OWNERSHIP_POLICY.fillIfEmptyAssets).toContain("branded_front_template_url");
    expect(FIELD_OWNERSHIP_POLICY.fillIfEmptyAssets).toContain("multilink_front_template_url");
  });

  it("proposes standard angled image fill from trusted existing image JSON only when empty", () => {
    const { updates, manual } = getFillIfEmptyAssetUpdates(
      {
        slug: "google-review-stand",
        standard_angled_image_url: null,
        branded_angled_image_url: null,
        branded_front_template_url: null,
        images: [{ src: "/uploads/products/v5/google-review-stand.png", alt: "Google Review Stand" }]
      },
      {
        slug: "google-review-stand",
        images: [{ src: "/uploads/products/v5/google-review-stand.png", alt: "Google Review Stand" }],
        assetSet: {}
      }
    );

    expect(updates).toContainEqual({
      slug: "google-review-stand",
      field: "standard_angled_image_url",
      value: "/uploads/products/v5/google-review-stand.png",
      action: "fill-if-empty"
    });
    expect(manual).toEqual([
      { slug: "google-review-stand", field: "branded_angled_image_url", action: "manual-asset-required" },
      { slug: "google-review-stand", field: "branded_front_template_url", action: "manual-asset-required" },
      { slug: "google-review-stand", field: "multilink_front_template_url", action: "manual-asset-required" }
    ]);
  });

  it("does not overwrite existing asset fields", () => {
    const { updates } = getFillIfEmptyAssetUpdates(
      {
        slug: "google-review-stand",
        standard_angled_image_url: "/uploads/products/current.png",
        images: [{ src: "/uploads/products/replacement.png", alt: "Replacement" }]
      },
      {
        slug: "google-review-stand",
        images: [{ src: "/uploads/products/replacement.png", alt: "Replacement" }],
        assetSet: {}
      }
    );

    expect(updates.some((update: { field: string }) => update.field === "standard_angled_image_url")).toBe(false);
  });

  it("rejects placeholder and temporary assets as fill candidates", () => {
    const { updates } = getFillIfEmptyAssetUpdates(
      {
        slug: "google-review-stand",
        standard_angled_image_url: null,
        images: [{ src: "/uploads/products/placeholder-google.png", alt: "Placeholder" }]
      },
      {
        slug: "google-review-stand",
        images: [{ src: "/uploads/products/placeholder-google.png", alt: "Placeholder" }],
        assetSet: {}
      }
    );

    expect(updates.some((update: { field: string }) => update.field === "standard_angled_image_url")).toBe(false);
  });

  it("reports missing approved products without creating write actions", () => {
    const plan = createCatalogReconciliationPlan({
      databaseProducts: [],
      productOptions: [],
      productBusinessUses: []
    });

    expect(plan.missingProducts.length).toBeGreaterThan(0);
    expect(plan.missingProducts[0]).toHaveProperty("action", "manual-approval-required");
    expect(plan.productionWrites).toBe(0);
  });

  it("reports backend-only products instead of deleting or archiving them", () => {
    const plan = createCatalogReconciliationPlan({
      databaseProducts: [
        {
          slug: "qa-custom-hosted-product",
          title: "QA Custom Hosted Product",
          status: "active",
          is_active: true
        }
      ],
      productOptions: [],
      productBusinessUses: []
    });

    expect(plan.dbOnlyProducts).toContainEqual({
      slug: "qa-custom-hosted-product",
      title: "QA Custom Hosted Product",
      status: "active",
      isActive: true,
      action: "report-only"
    });
  });

  it("preserves admin-owned field differences in the plan", () => {
    const plan = createCatalogReconciliationPlan({
      databaseProducts: [
        {
          slug: "google-review-stand",
          title: "Admin Edited Google Stand",
          sku: "ADMIN-GRS",
          is_active: true
        }
      ],
      productOptions: [],
      productBusinessUses: []
    });

    expect(plan.fieldMismatches).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slug: "google-review-stand",
          field: "title",
          owner: "admin",
          action: "preserve-db-value"
        })
      ])
    );
  });

  it("reports option mismatches without deleting backend options", () => {
    const plan = createCatalogReconciliationPlan({
      databaseProducts: [
        {
          slug: "google-review-stand",
          title: "Google Review Stand",
          is_active: true
        }
      ],
      productOptions: [
        {
          product_slug: "google-review-stand",
          option_code: "standard_direct",
          is_active: true
        }
      ],
      productBusinessUses: []
    });

    expect(plan.optionMismatches).toEqual([
      expect.objectContaining({
        slug: "google-review-stand",
        action: "report-only"
      })
    ]);
  });

  it("includes production write count in formatted dry-run output", () => {
    const output = formatReconciliationPlan(
      createCatalogReconciliationPlan({
        databaseProducts: [],
        productOptions: [],
        productBusinessUses: []
      })
    );

    expect(output).toContain("Catalog product sync is running in DRY-RUN mode.");
    expect(output).toContain("Production writes performed: 0");
  });
});
