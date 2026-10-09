import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), report: vi.fn() }));
vi.mock("@/lib/admin-auth", () => ({ requireAdminApi: mocks.auth }));
vi.mock("@/lib/live-analytics", () => ({ liveAnalyticsReport: mocks.report }));
import { GET } from "@/app/api/admin/analytics/live/route";
beforeEach(() => { vi.resetAllMocks(); mocks.auth.mockResolvedValue(null); });
it("does not read visitor activity for unauthenticated requests", async () => {
  mocks.auth.mockResolvedValue(new Response(null, { status: 401 }));
  expect((await GET()).status).toBe(401);
  expect(mocks.report).not.toHaveBeenCalled();
});
it("prevents caching live visitor data", async () => {
  mocks.report.mockResolvedValue({ updatedAt: "2026-10-09T20:00:00Z", active: [], events: [] });
  const response = await GET();
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect((await response.json()).active).toEqual([]);
});
it("reports an outage without substituting zero activity or leaking database errors", async () => {
  mocks.report.mockRejectedValue(new Error("private database details"));
  const response = await GET();
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ error: "Live activity is temporarily unavailable." });
});
