import { describe, expect, it, vi } from "vitest";
import { createHostedPagePreviewLoader } from "../../src/lib/hosted-page-preview-loader";
import type { HostedPageEditorDraft } from "../../src/lib/hosted-page-editor-shared";

const draft: HostedPageEditorDraft = {
  businessName: "Test business", appearance: { theme: "light", accentColor: "#0f766e" }, buttons: []
};
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
const response = (html: string) => Response.json({ html });

describe("hosted page preview requests", () => {
  it("shares identical in-flight requests but allows refresh after completion", async () => {
    const request = deferred<Response>();
    const fetcher = vi.fn().mockReturnValueOnce(request.promise).mockResolvedValue(response("refreshed"));
    const loader = createHostedPagePreviewLoader(fetcher);
    const first = loader.load("page-a", draft);
    expect(loader.load("page-a", structuredClone(draft))).toBe(first);
    await Promise.resolve();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ code: "page-a", draft });
    request.resolve(response("first"));
    expect(await first).toEqual({ html: "first" });
    expect(await loader.load("page-a", draft)).toEqual({ html: "refreshed" });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it.each(["draft", "code"])("aborts an obsolete %s request and ignores its late response", async (change) => {
    const old = deferred<Response>(), next = deferred<Response>();
    const fetcher = vi.fn().mockReturnValueOnce(old.promise).mockReturnValueOnce(next.promise);
    const loader = createHostedPagePreviewLoader(fetcher);
    const first = loader.load("page-a", draft);
    await Promise.resolve();
    const second = loader.load(change === "code" ? "page-b" : "page-a", change === "draft" ? { ...draft, businessName: "New" } : draft);
    expect(fetcher.mock.calls[0][1].signal.aborted).toBe(true);
    await Promise.resolve();
    old.resolve(response("obsolete"));
    expect(await first).toBeNull();
    expect(loader.load(change === "code" ? "page-b" : "page-a", change === "draft" ? { ...draft, businessName: "New" } : draft)).toBe(second);
    next.resolve(response("current"));
    expect(await second).toEqual({ html: "current" });
  });

  it("cancels a request on cleanup even when the transport ignores abort", async () => {
    const request = deferred<Response>();
    const fetcher = vi.fn().mockReturnValue(request.promise);
    const loader = createHostedPagePreviewLoader(fetcher);
    const pending = loader.load("page-a", draft);
    await Promise.resolve();
    loader.cancel();
    expect(fetcher.mock.calls[0][1].signal.aborted).toBe(true);
    request.resolve(response("obsolete"));
    expect(await pending).toBeNull();
  });

  it("does not send a request cancelled before it starts", async () => {
    const fetcher = vi.fn();
    const loader = createHostedPagePreviewLoader(fetcher);
    const pending = loader.load("page-a", draft);
    loader.cancel();
    expect(await pending).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("reports connection failures and permits retry", async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new TypeError("offline")).mockResolvedValue(response("recovered"));
    const loader = createHostedPagePreviewLoader(fetcher);
    expect(await loader.load("page-a", draft)).toEqual({ error: "Preview connection interrupted. Try refreshing the preview." });
    expect(await loader.load("page-a", draft)).toEqual({ html: "recovered" });
  });

  it("handles synchronous transport failures without retaining a failed request", async () => {
    const fetcher = vi.fn().mockImplementationOnce(() => { throw new Error("offline"); }).mockResolvedValue(response("recovered"));
    const loader = createHostedPagePreviewLoader(fetcher);
    expect(await loader.load("page-a", draft)).toHaveProperty("error");
    expect(await loader.load("page-a", draft)).toEqual({ html: "recovered" });
  });

  it("preserves server validation errors and handles malformed responses", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(Response.json({ error: "Invalid link" }, { status: 400 }))
      .mockResolvedValueOnce(new Response("unavailable", { status: 503 })).mockResolvedValueOnce(Response.json(null));
    const loader = createHostedPagePreviewLoader(fetcher);
    expect(await loader.load("page-a", draft)).toEqual({ error: "Invalid link" });
    expect(await loader.load("page-a", draft)).toEqual({ error: "Preview could not be generated yet." });
    expect(await loader.load("page-a", draft)).toEqual({ html: "" });
  });

  it("does not share requests between editor instances", async () => {
    const fetcher = vi.fn().mockImplementation(() => Promise.resolve(response("ok")));
    await Promise.all([createHostedPagePreviewLoader(fetcher).load("page-a", draft), createHostedPagePreviewLoader(fetcher).load("page-a", draft)]);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
