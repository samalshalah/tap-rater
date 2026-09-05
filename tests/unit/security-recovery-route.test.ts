import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), context: vi.fn(), state: vi.fn(), backup: vi.fn(), drill: vi.fn(), restore: vi.fn() }));
vi.mock("@/lib/admin-auth", () => ({ requireAdminApi: mocks.auth }));
vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: mocks.context }));
vi.mock("@/lib/media-recovery", () => ({ getMediaBackupState: mocks.state, runMediaBackupBatch: mocks.backup, runMediaRecoveryDrill: mocks.drill, restoreMediaToStaging: mocks.restore }));
import { GET, POST } from "@/app/api/admin/recovery/route";

describe("recovery admin boundary", () => {
  beforeEach(() => { vi.resetAllMocks(); mocks.auth.mockResolvedValue(null); mocks.context.mockResolvedValue({ env: { PRODUCT_MEDIA_BUCKET: {}, RECOVERY_BACKUPS: {} } }); });
  it("rejects unauthenticated status and every mutation before accessing storage", async () => {
    mocks.auth.mockResolvedValue(Response.json({ error: "unauthorized" }, { status: 401 }));
    expect((await GET()).status).toBe(401);
    for (const action of ["backup", "drill", "restore"]) {
      expect((await POST(new Request("https://taprater.com/api/admin/recovery", { method: "POST", body: JSON.stringify({ action }) }))).status).toBe(401);
    }
    expect(mocks.context).not.toHaveBeenCalled();
  });
  it("rejects malformed operations", async () => {
    for (const body of [null, {}, { action: "delete" }, { action: "restore" }]) {
      expect((await POST(new Request("https://taprater.com/api/admin/recovery", { method: "POST", body: JSON.stringify(body) }))).status).toBe(400);
    }
  });
  it("reports unavailable storage without leaking credentials or provider errors", async () => {
    mocks.context.mockRejectedValue(new Error("secret provider detail"));
    const result = await GET();
    expect(result.status).toBe(503);
    expect(await result.text()).not.toContain("secret provider detail");
  });
});
