import { describe, expect, it, vi } from "vitest";
import {
  isAdminRequestType,
  updateAdminRequestWithClient,
  type AdminRequestDbClient
} from "@/lib/admin-requests";

describe("admin request updates", () => {
  it("maps request types to their tables and resolves requests", async () => {
    const db = createClient({ data: { id: "request-1" }, error: null });

    await expect(
      updateAdminRequestWithClient(
        db.client,
        "setup",
        "request-1",
        { status: "resolved", adminNotes: "Setup completed." },
        new Date("2026-09-05T12:00:00.000Z")
      )
    ).resolves.toEqual({
      ok: true,
      status: "resolved",
      adminNotes: "Setup completed.",
      updatedAt: "2026-09-05T12:00:00.000Z",
      resolvedAt: "2026-09-05T12:00:00.000Z"
    });

    expect(db.from).toHaveBeenCalledWith("setup_requests");
    expect(db.update).toHaveBeenCalledWith({
      status: "resolved",
      admin_notes: "Setup completed.",
      resolved_at: "2026-09-05T12:00:00.000Z",
      updated_at: "2026-09-05T12:00:00.000Z"
    });
    expect(db.eq).toHaveBeenCalledWith("id", "request-1");
  });

  it("clears the resolved timestamp when a request is reopened", async () => {
    const db = createClient({ data: { id: "request-2" }, error: null });

    const result = await updateAdminRequestWithClient(
      db.client,
      "link-change",
      "request-2",
      { status: "in_progress", adminNotes: "Waiting on the customer." },
      new Date("2026-09-05T13:00:00.000Z")
    );

    expect(result).toEqual({
      ok: true,
      status: "in_progress",
      adminNotes: "Waiting on the customer.",
      updatedAt: "2026-09-05T13:00:00.000Z"
    });
    expect(db.from).toHaveBeenCalledWith("change_link_requests");
    expect(db.update).toHaveBeenCalledWith(expect.objectContaining({ resolved_at: null }));
  });

  it("reports missing requests and database failures", async () => {
    const missing = createClient({ data: null, error: null });
    const failed = createClient({ data: null, error: { message: "database unavailable" } });

    await expect(
      updateAdminRequestWithClient(missing.client, "contact", "missing", { status: "new", adminNotes: "" })
    ).resolves.toMatchObject({ ok: false, status: 404 });
    await expect(
      updateAdminRequestWithClient(failed.client, "contact", "failed", { status: "new", adminNotes: "" })
    ).resolves.toMatchObject({ ok: false, status: 500 });
  });

  it("accepts only supported request route types", () => {
    expect(["contact", "setup", "link-change"].every(isAdminRequestType)).toBe(true);
    expect(isAdminRequestType("orders")).toBe(false);
  });
});

function createClient(result: { data: Record<string, unknown> | null; error: { message: string } | null }) {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const select = vi.fn(() => ({ maybeSingle }));
  const eq = vi.fn(() => ({ select }));
  const update = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ update }));

  return { client: { from } as unknown as AdminRequestDbClient, from, update, eq };
}
