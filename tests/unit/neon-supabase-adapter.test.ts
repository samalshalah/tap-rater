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
      customization_options: ["standard_design", "add_logo", "custom_design"],
      allows_logo_upload: true,
      allows_custom_design: true,
      design_mode: "standard",
      featured: true,
      images: [{ src: "/uploads/products/google.jpg", alt: "Google review stand" }],
      variants: [{ id: "white", label: "White", sku: "TR-GOOGLE-WHITE", stockStatus: "instock" }]
    });

    expect(result.error).toBeNull();
    expect(query.mock.calls[0][0]).toContain("on conflict (slug) do update");
    expect(query.mock.calls[0][0]).toContain("customization_options");
    expect(query.mock.calls[0][0]).toContain("featured");
    expect(query.mock.calls[0][0]).toContain("images");
    expect(query.mock.calls[0][0]).toContain("variants");
    expect(query.mock.calls[0][0]).toContain("::text[]");
    expect(query.mock.calls[0][0]).toContain("::jsonb");
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
