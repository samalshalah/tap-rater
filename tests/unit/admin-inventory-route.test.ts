import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdminApi: vi.fn(),
  updateAdminInventory: vi.fn()
}));

vi.mock("@/lib/admin-auth", () => ({ requireAdminApi: mocks.requireAdminApi }));
vi.mock("@/lib/admin-inventory", () => ({ updateAdminInventory: mocks.updateAdminInventory }));

import { PATCH } from "@/app/api/admin/products/[slug]/inventory/route";

describe("admin inventory route", () => {
  beforeEach(() => {
    mocks.requireAdminApi.mockReset();
    mocks.requireAdminApi.mockResolvedValue(null);
    mocks.updateAdminInventory.mockReset();
    mocks.updateAdminInventory.mockResolvedValue({ ok: true, stockStatus: "outofstock" });
  });

  it("requires admin authentication", async () => {
    mocks.requireAdminApi.mockResolvedValue(Response.json({ error: "Admin authentication required." }, { status: 401 }));

    const response = await PATCH(createRequest(), { params: Promise.resolve({ slug: "google-review-stand" }) });

    expect(response.status).toBe(401);
    expect(mocks.updateAdminInventory).not.toHaveBeenCalled();
  });

  it("rejects malformed slugs and invalid payloads", async () => {
    const badSlug = await PATCH(createRequest(), { params: Promise.resolve({ slug: "../products" }) });
    const badPayload = await PATCH(createRequest({ stockStatus: "backorder" }), {
      params: Promise.resolve({ slug: "google-review-stand" })
    });

    expect(badSlug.status).toBe(400);
    expect(badPayload.status).toBe(400);
    expect(mocks.updateAdminInventory).not.toHaveBeenCalled();
  });

  it("updates a valid product and forwards service errors", async () => {
    const success = await PATCH(createRequest(), { params: Promise.resolve({ slug: "google-review-stand" }) });

    expect(success.status).toBe(200);
    await expect(success.json()).resolves.toEqual({ ok: true, stockStatus: "outofstock" });
    expect(mocks.updateAdminInventory).toHaveBeenCalledWith("google-review-stand", "outofstock");

    mocks.updateAdminInventory.mockResolvedValue({ ok: false, error: "Product was not found.", status: 404 });
    const missing = await PATCH(createRequest(), { params: Promise.resolve({ slug: "google-review-stand" }) });
    expect(missing.status).toBe(404);
  });
});

function createRequest(body: unknown = { stockStatus: "outofstock" }) {
  return new Request("https://taprater.com/api/admin/products/google-review-stand/inventory", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}
