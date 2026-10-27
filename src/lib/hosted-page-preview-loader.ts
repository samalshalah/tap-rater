import type { HostedPageEditorDraft } from "./hosted-page-editor-shared";

type PreviewResult = { html: string } | { error: string } | null;

/** Request sharing is scoped to one editor, never across accounts or pages. */
export function createHostedPagePreviewLoader(fetcher: typeof fetch = fetch) {
  let sequence = 0;
  let pending: { key: string; controller: AbortController; promise: Promise<PreviewResult> } | undefined;

  function cancel() {
    sequence++;
    pending?.controller.abort();
    pending = undefined;
  }

  function load(code: string, draft: HostedPageEditorDraft): Promise<PreviewResult> {
    const key = JSON.stringify({ code, draft });
    if (pending?.key === key) return pending.promise;
    cancel();
    const requestId = sequence;
    const controller = new AbortController();
    const promise = Promise.resolve().then(async (): Promise<PreviewResult> => {
      if (requestId !== sequence) return null;
      try {
        const response = await fetcher("/api/account/hosted-page/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: key,
          signal: controller.signal
        });
        const body = await response.json().catch(() => null);
        if (requestId !== sequence) return null;
        return response.ok
          ? { html: body?.html ?? "" }
          : { error: body?.error ?? "Preview could not be generated yet." };
      } catch {
        return requestId !== sequence ? null : { error: "Preview connection interrupted. Try refreshing the preview." };
      } finally {
        if (requestId === sequence) pending = undefined;
      }
    });
    pending = { key, controller, promise };
    return promise;
  }

  return { load, cancel };
}
