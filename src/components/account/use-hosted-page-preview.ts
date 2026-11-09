"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { HostedPageEditorDraft, HostedPageEditorRecord } from "@/lib/hosted-page-editor-shared";
// Import the browser-safe draft renderer directly.  The editor service module also
// owns filesystem/database helpers, which must never be pulled into this client hook.
import { renderHostedPageDraftPreview } from "@/lib/hosted-page-editor-draft";
import { createHostedPagePreviewLoader } from "@/lib/hosted-page-preview-loader";

export function useHostedPagePreview(page: HostedPageEditorRecord, draft: HostedPageEditorDraft) {
  const fallbackPreview = useCallback((nextDraft: HostedPageEditorDraft) => {
    try { return renderHostedPageDraftPreview({ ...page, draft: nextDraft }); }
    catch { return ""; }
  }, [page]);
  const [previewHtml, setPreviewHtml] = useState(() => fallbackPreview(draft));
  const [previewMessage, setPreviewMessage] = useState("");
  const loader = useMemo(() => createHostedPagePreviewLoader(), []);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const refreshPreview = useCallback(async (nextDraft = draft) => {
    clearTimeout(timer.current);
    setPreviewMessage("");
    const fallback = fallbackPreview(nextDraft);
    if (fallback) setPreviewHtml(fallback);
    const result = await loader.load(page.code, nextDraft);
    if (!result) return;
    if ("html" in result && result.html.trim()) setPreviewHtml(result.html);
    else if ("html" in result) setPreviewMessage("Preview is refreshing. Your current draft is shown.");
    else setPreviewMessage(result.error);
  }, [page.code, draft, loader, fallbackPreview]);

  useEffect(() => {
    timer.current = setTimeout(() => { void refreshPreview(); }, 250);
    return () => {
      clearTimeout(timer.current);
      loader.cancel();
    };
  }, [refreshPreview, loader]);

  return { previewHtml, previewMessage, refreshPreview };
}
