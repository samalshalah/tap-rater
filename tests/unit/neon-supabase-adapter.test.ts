import { describe, expect, it, vi } from "vitest";
import { createNeonSupabaseAdapter, getDatabaseUrlFromEnv } from "@/lib/neon-supabase-adapter";

describe("Neon Supabase adapter", () => {
  it("detects Neon connection strings without requiring Supabase env vars", () => {
    expect(getDatabaseUrlFromEnv({ DATABASE_URL: "postgres://user:pass@example.com/db" })).toBe("postgres://user:pass@example.com/db");
    expect(getDatabaseUrlFromEnv({ NEON_DATABASE_URL: "postgres://user:pass@example.com/neon" })).toBe("postgres://user:pass@example.com/neon");
    expect(getDatabaseUrlFromEnv({})).toBeUndefined();
  });

  it("builds safe select queries with filters, ordering, and limits", async () => {
    const query = vi.fn().mockResolvedValue([
      {
        id: "device-1",
        device_code: "TR-TEST123",
        customers: { email: "owner@example.com" },
        businesses: { business_name: "Local Shop" }
      }
    ]);
    const client = createNeonSupabaseAdapter(query);

    const result = await client
      .from("devices")
      .select("*, customers(email), businesses(business_name)")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(5);

    expect(result.error).toBeNull();
    expect(result.data?.[0]).toMatchObject({
      device_code: "TR-TEST123",
      customers: { email: "owner@example.com" },
      businesses: { business_name: "Local Shop" }
    });
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("left join customers"),
      ["active", 5]
    );
    expect(query.mock.calls[0][0]).toContain("order by devices.created_at desc");
    expect(query.mock.calls[0][0]).toContain("limit $2");
  });

  it("supports insert select maybeSingle for created rows", async () => {
    const query = vi.fn().mockResolvedValue([{ id: "device-created", device_code: "TR-NEW123" }]);
    const client = createNeonSupabaseAdapter(query);

    const result = await client
      .from("devices")
      .insert({
        device_code: "TR-NEW123",
        activation_code_hash: "hash",
        product_type: "google_review",
        service_mode: "basic_redirect",
        status: "unactivated"
      })
      .select("id,device_code")
      .maybeSingle();

    expect(result).toEqual({ data: { id: "device-created", device_code: "TR-NEW123" }, error: null });
    expect(query.mock.calls[0][0]).toContain("insert into devices");
    expect(query.mock.calls[0][0]).toContain("returning devices.id, devices.device_code");
  });

  it("upserts JSON content using the table conflict target", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const client = createNeonSupabaseAdapter(query);

    const result = await client.from("site_content").upsert({
      key: "homepage",
      type: "homepage",
      status: "published",
      payload: { heroTitle: "Tap Rater" }
    });

    expect(result.error).toBeNull();
    expect(query.mock.calls[0][0]).toContain("on conflict (key) do update");
    expect(query.mock.calls[0][0]).toContain("$4::jsonb");
    expect(query.mock.calls[0][1][3]).toBe(JSON.stringify({ heroTitle: "Tap Rater" }));
  });

  it("upserts product customization columns with text-array casting", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const client = createNeonSupabaseAdapter(query);

    const result = await client.from("products").upsert({
      slug: "google-review-stand",
      title: "Google Review Stand",
      sku: "TR-GOOGLE-STAND",
      category_slug: "reviews",
      base_price_cents: 4900,
      stock_status: "instock",
      short_description: "Short text",
      description: "Long text",
      format: "stand",
      customization_options: ["standard_design", "add_logo", "custom_design"],
      allows_logo_upload: true,
      allows_custom_design: true,
      design_mode: "standard"
    });

    expect(result.error).toBeNull();
    expect(query.mock.calls[0][0]).toContain("on conflict (slug) do update");
    expect(query.mock.calls[0][0]).toContain("format");
    expect(query.mock.calls[0][0]).toContain("customization_options");
    expect(query.mock.calls[0][0]).toContain("::text[]");
  });

  it("supports composite upsert conflict targets for product options", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const client = createNeonSupabaseAdapter(query);

    const result = await client.from("product_options").upsert(
      [
        {
          product_slug: "google-review-stand",
          option_code: "standard_direct",
          title: "Standard Direct",
          description: "Ready-made NFC stand.",
          price_cents: 3900,
          requires_destination_url: true,
          has_qr: false,
          requires_logo: false,
          requires_business_name: false,
          requires_design_step: false,
          requires_front_proof: false,
          requires_subscription: false,
          account_required: false,
          supports_reorderable_links: false,
          supports_link_visibility: false,
          is_active: true,
          sort_order: 10
        }
      ],
      { onConflict: "product_slug,option_code" }
    );

    expect(result.error).toBeNull();
    expect(query.mock.calls[0][0]).toContain("on conflict (product_slug, option_code) do update");
    expect(query.mock.calls[0][0]).not.toContain("product_slug = excluded.product_slug");
    expect(query.mock.calls[0][0]).not.toContain("option_code = excluded.option_code");
  });

  it("allows invoice line-item upserts", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const client = createNeonSupabaseAdapter(query);

    const result = await client.from("billing_invoice_items").upsert(
      {
        billing_invoice_id: "11111111-1111-1111-1111-111111111111",
        line_item_index: 0,
        title: "Google Review Stand",
        quantity: 1,
        amount_cents: 3900,
        recurring_amount_cents: 0,
        metadata_json: { source: "checkout" }
      },
      { onConflict: "billing_invoice_id,line_item_index" }
    );

    expect(result.error).toBeNull();
    expect(query.mock.calls[0][0]).toContain("insert into billing_invoice_items");
    expect(query.mock.calls[0][0]).toContain("on conflict (billing_invoice_id, line_item_index) do update");
    expect(query.mock.calls[0][0]).toContain("::jsonb");
  });

  it("builds one filtered delete query for product slugs", async () => {
    const query = vi.fn().mockResolvedValue([{ slug: "google-review-stand" }]);
    const client = createNeonSupabaseAdapter(query);

    const result = await client
      .from("products")
      .delete()
      .in("slug", ["google-review-stand", "yelp-review-stand"])
      .select("slug");

    expect(result.error).toBeNull();
    expect(result.data).toEqual([{ slug: "google-review-stand" }]);
    expect(query).toHaveBeenCalledWith(
      "delete from products where products.slug = any($1::text[]) returning products.slug",
      [["google-review-stand", "yelp-review-stand"]]
    );
  });

  it("allows catalog architecture tables and product asset columns", async () => {
    const query = vi.fn().mockResolvedValue([
      {
        slug: "review-stands",
        title: "Review Stands",
        image_url: "/uploads/products/google-review-stand.png"
      }
    ]);
    const client = createNeonSupabaseAdapter(query);

    const result = await client.from("stand_types").select("slug,title,image_url,banner_image_url,buyer_intent").eq("is_active", true).order("sort_order", { ascending: true });

    expect(result.error).toBeNull();
    expect(query.mock.calls[0][0]).toContain("stand_types.banner_image_url");
    expect(query.mock.calls[0][0]).toContain("stand_types.buyer_intent");
    expect(query.mock.calls[0][0]).toContain("order by stand_types.sort_order asc");

    await client.from("products").select("stand_type_slug,primary_platform_slug,multilink_angled_image_url,multilink_front_template_url,asset_readiness_status,landing_page_preview_config");
    expect(query.mock.calls[1][0]).toContain("products.asset_readiness_status");

    await client.from("product_option_templates").select("option_code,max_links,supports_reorderable_links,supports_link_visibility,landing_page_url_pattern,footer_label");
    expect(query.mock.calls[2][0]).toContain("product_option_templates.max_links");
  });

  it("returns Supabase-style errors for unsupported table or column names", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const client = createNeonSupabaseAdapter(query);

    const tableResult = await client.from("unsafe_table").select("*");
    const columnResult = await client.from("devices").select("unsafe_column");

    expect(tableResult.error?.message).toContain("Unsupported table");
    expect(columnResult.error?.message).toContain("Unsupported column");
    expect(query).not.toHaveBeenCalled();
  });
});
