"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { HostedPageEditorDraft } from "@/lib/hosted-page-editor-shared";
import { createHostedPagePreviewLoader } from "@/lib/hosted-page-preview-loader";

export function useHostedPagePreview(code: string, draft: HostedPageEditorDraft) {
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewMessage, setPreviewMessage] = useState("");
  const loader = useMemo(() => createHostedPagePreviewLoader(), []);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const refreshPreview = useCallback(async (nextDraft = draft) => {
    clearTimeout(timer.current);
    setPreviewMessage("");
    const result = await loader.load(code, nextDraft);
    if (!result) return;
    if ("html" in result) setPreviewHtml(result.html);
    else setPreviewMessage(result.error);
  }, [code, draft, loader]);

  useEffect(() => {
    timer.current = setTimeout(() => { void refreshPreview(); }, 250);
    return () => {
      clearTimeout(timer.current);
      loader.cancel();
    };
  }, [refreshPreview, loader]);

  return { previewHtml, previewMessage, refreshPreview };
}
