import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchOrderFile, saveOrderFile } from "@/lib/order-file-download";

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers(); });
describe("order file downloads", () => {
  it("fetches authenticated file bytes with no-store and honors the attachment filename", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("<svg/>", { headers: { "Content-Type": "image/svg+xml", "Content-Disposition": 'attachment; filename="order-design.svg"' } }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await fetchOrderFile("/api/admin/orders/id/artwork/0", "fallback.svg");
    expect(result.filename).toBe("order-design.svg"); expect(await result.blob.text()).toBe("<svg/>");
    expect(fetchMock).toHaveBeenCalledWith("/api/admin/orders/id/artwork/0", expect.objectContaining({ credentials: "same-origin", cache: "no-store", signal: expect.any(AbortSignal) }));
  });
  it("shows an expired-session error instead of downloading an error page", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ error: "Unauthorized" }, { status: 401 })));
    await expect(fetchOrderFile("/file", "file.svg")).rejects.toThrow("Sign in to admin again");
  });
  it("reports artwork payment/approval and missing-file errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ error: "Artwork is not approved." }, { status: 409 })));
    await expect(fetchOrderFile("/file", "file.svg")).rejects.toThrow("Artwork is not approved.");
  });
  it.each(["text/html", "application/json"])("never saves a successful error page as an image: %s", async (type) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("error", { headers: { "Content-Type": type } })));
    await expect(fetchOrderFile("/file", "file.svg")).rejects.toThrow("did not return a design file");
  });
  it("rejects empty files and ignores unsafe filenames", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { headers: { "Content-Type": "image/png" } })));
    await expect(fetchOrderFile("/file", "file.png")).rejects.toThrow("empty");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("image", { headers: { "Content-Type": "image/png", "Content-Disposition": 'attachment; filename="../unsafe.png"' } })));
    expect((await fetchOrderFile("/file", "file.png")).filename).toBe("file.png");
  });
  it("uses an explicit browser download without opening a new tab and releases the object URL", () => {
    vi.useFakeTimers();
    const link = { href: "", download: "", click: vi.fn(), remove: vi.fn() };
    vi.stubGlobal("document", { createElement: vi.fn().mockReturnValue(link), body: { appendChild: vi.fn() } });
    vi.stubGlobal("window", { setTimeout });
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:test-download"); const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    saveOrderFile(new Blob(["test"]), "order-design.svg");
    expect(link.href).toBe("blob:test-download"); expect(link.download).toBe("order-design.svg"); expect(link.click).toHaveBeenCalledOnce(); expect(link.remove).toHaveBeenCalledOnce();
    expect(revoke).not.toHaveBeenCalled(); vi.advanceTimersByTime(60000); expect(revoke).toHaveBeenCalledWith("blob:test-download");
  });
});
