import { afterEach, describe, expect, it, vi } from "vitest";

describe("admin product CSV routes", () => {
  afterEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
  });

  it("requires admin auth for export", async () => {
    vi.doMock("@/lib/admin-auth", () => ({
      requireAdminApi: vi.fn().mockResolvedValue(new Response("Unauthorized", { status: 401 }))
    }));
    vi.doMock("@/lib/admin-product-csv", () => ({
      buildProductCsvTemplate: vi.fn(),
      exportAdminProductsCsv: vi.fn()
    }));

    const { GET } = await import("@/app/api/admin/products/export/route");
    const response = await GET(new Request("https://taprater.test/api/admin/products/export"));

    expect(response.status).toBe(401);
  });

  it("exports a CSV attachment for admins", async () => {
    vi.doMock("@/lib/admin-auth", () => ({
      requireAdminApi: vi.fn().mockResolvedValue(null)
    }));
    vi.doMock("@/lib/admin-product-csv", () => ({
      buildProductCsvTemplate: vi.fn().mockReturnValue("slug,title"),
      exportAdminProductsCsv: vi.fn().mockResolvedValue("slug,title\r\ngoogle-review-stand,Google Review Stand")
    }));

    const { GET } = await import("@/app/api/admin/products/export/route");
    const response = await GET(new Request("https://taprater.test/api/admin/products/export"));

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/csv");
    expect(response.headers.get("Content-Disposition")).toMatch(/tap-rater-products-\d{4}-\d{2}-\d{2}\.csv/);
    await expect(response.text()).resolves.toContain("google-review-stand");
  });

  it("requires admin auth for import", async () => {
    vi.doMock("@/lib/admin-auth", () => ({
      requireAdminApi: vi.fn().mockResolvedValue(new Response("Unauthorized", { status: 401 }))
    }));
    vi.doMock("@/lib/db", () => ({ hasSupabaseAdminConfig: vi.fn().mockReturnValue(true) }));

    const { POST } = await import("@/app/api/admin/products/import/route");
    const response = await POST(new Request("https://taprater.test/api/admin/products/import", { method: "POST" }));

    expect(response.status).toBe(401);
  });

  it("validates and applies CSV imports server-side", async () => {
    const validateProductCsvImport = vi.fn().mockResolvedValue({ ok: true, totalRows: 1, validRows: 1, createCount: 0, updateCount: 1, errors: [] });
    const applyProductCsvImport = vi
      .fn()
      .mockResolvedValue({ ok: true, totalRows: 1, validRows: 1, createCount: 0, updateCount: 1, errors: [], created: 0, updated: 1, skipped: 0 });
    vi.doMock("@/lib/admin-auth", () => ({ requireAdminApi: vi.fn().mockResolvedValue(null) }));
    vi.doMock("@/lib/db", () => ({ hasSupabaseAdminConfig: vi.fn().mockReturnValue(true) }));
    vi.doMock("@/lib/admin-product-csv", () => ({ validateProductCsvImport, applyProductCsvImport }));

    const { POST } = await import("@/app/api/admin/products/import/route");
    const validateForm = new FormData();
    validateForm.set("mode", "validate");
    validateForm.set("file", new File(["slug,title"], "products.csv", { type: "text/csv" }));
    const validateResponse = await POST(new Request("https://taprater.test/api/admin/products/import", { method: "POST", body: validateForm }));

    const applyForm = new FormData();
    applyForm.set("mode", "apply");
    applyForm.set("file", new File(["slug,title"], "products.csv", { type: "text/csv" }));
    const applyResponse = await POST(new Request("https://taprater.test/api/admin/products/import", { method: "POST", body: applyForm }));

    expect(validateResponse.status).toBe(200);
    expect(applyResponse.status).toBe(200);
    expect(validateProductCsvImport).toHaveBeenCalledWith("slug,title");
    expect(applyProductCsvImport).toHaveBeenCalledWith("slug,title");
  });

  it("rejects non-CSV uploads", async () => {
    vi.doMock("@/lib/admin-auth", () => ({ requireAdminApi: vi.fn().mockResolvedValue(null) }));
    vi.doMock("@/lib/db", () => ({ hasSupabaseAdminConfig: vi.fn().mockReturnValue(true) }));
    vi.doMock("@/lib/admin-product-csv", () => ({ validateProductCsvImport: vi.fn(), applyProductCsvImport: vi.fn() }));

    const { POST } = await import("@/app/api/admin/products/import/route");
    const form = new FormData();
    form.set("mode", "validate");
    form.set("file", new File(["x"], "products.txt", { type: "text/plain" }));
    const response = await POST(new Request("https://taprater.test/api/admin/products/import", { method: "POST", body: form }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Only .csv files are supported." });
  });
});
