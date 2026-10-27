import { afterEach, describe, expect, it, vi } from "vitest";
import { loadWebsiteNavigation } from "@/lib/website-content-client";

afterEach(() => vi.unstubAllGlobals());
describe("shared navigation loading", () => {
  it("shares concurrent header/footer reads but refreshes on a later mount", async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ header: { items: [] }, footer: { columns: [] } }) });
    vi.stubGlobal("fetch", fetcher);
    const header = loadWebsiteNavigation(), footer = loadWebsiteNavigation();
    expect(header).toBe(footer);
    await Promise.all([header, footer]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    await loadWebsiteNavigation();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("allows retry after a network failure", async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue({ ok: false });
    vi.stubGlobal("fetch", fetcher);
    await expect(loadWebsiteNavigation()).rejects.toThrow("offline");
    await expect(loadWebsiteNavigation()).resolves.toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
