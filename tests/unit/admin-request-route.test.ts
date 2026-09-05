import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdminApi: vi.fn(),
  updateAdminRequest: vi.fn()
}));

vi.mock("@/lib/admin-auth", () => ({ requireAdminApi: mocks.requireAdminApi }));
vi.mock("@/lib/admin-requests", () => ({
  isAdminRequestType: (value: string) => ["contact", "setup", "link-change"].includes(value),
  updateAdminRequest: mocks.updateAdminRequest
}));

import { PATCH } from "@/app/api/admin/requests/[type]/[id]/route";

const validId = "11111111-1111-4111-8111-111111111111";

describe("admin request route", () => {
  beforeEach(() => {
    mocks.requireAdminApi.mockReset();
    mocks.requireAdminApi.mockResolvedValue(null);
    mocks.updateAdminRequest.mockReset();
    mocks.updateAdminRequest.mockResolvedValue({
      ok: true,
      status: "in_progress",
      adminNotes: "Reviewing request.",
      updatedAt: "2026-09-05T12:00:00.000Z"
    });
  });

  it("requires admin authentication", async () => {
    mocks.requireAdminApi.mockResolvedValue(Response.json({ error: "Admin authentication required." }, { status: 401 }));

    const response = await PATCH(createRequest(), { params: Promise.resolve({ type: "contact", id: validId }) });

    expect(response.status).toBe(401);
    expect(mocks.updateAdminRequest).not.toHaveBeenCalled();
  });

  it("rejects unknown request types, malformed UUIDs, and invalid payloads", async () => {
    const badType = await PATCH(createRequest(), { params: Promise.resolve({ type: "orders", id: validId }) });
    const badId = await PATCH(createRequest(), { params: Promise.resolve({ type: "contact", id: "request-1" }) });
    const badPayload = await PATCH(createRequest({ status: "closed", adminNotes: "" }), {
      params: Promise.resolve({ type: "contact", id: validId })
    });

    expect(badType.status).toBe(400);
    expect(badId.status).toBe(400);
    expect(badPayload.status).toBe(400);
    expect(mocks.updateAdminRequest).not.toHaveBeenCalled();
  });

  it("updates a request and forwards service status codes", async () => {
    const success = await PATCH(createRequest(), { params: Promise.resolve({ type: "contact", id: validId }) });

    expect(success.status).toBe(200);
    await expect(success.json()).resolves.toMatchObject({ ok: true, status: "in_progress" });
    expect(mocks.updateAdminRequest).toHaveBeenCalledWith("contact", validId, {
      status: "in_progress",
      adminNotes: "Reviewing request."
    });

    mocks.updateAdminRequest.mockResolvedValue({ ok: false, error: "Request was not found.", status: 404 });
    const missing = await PATCH(createRequest(), { params: Promise.resolve({ type: "contact", id: validId }) });
    expect(missing.status).toBe(404);
  });
});

function createRequest(body: unknown = { status: "in_progress", adminNotes: "Reviewing request." }) {
  return new Request(`https://taprater.com/api/admin/requests/contact/${validId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}
