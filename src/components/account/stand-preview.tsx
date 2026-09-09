"use client";

import { RefreshCw } from "lucide-react";
import { useState } from "react";

export function StandPreview({ url, title }: { url?: string; title: string }) {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  return (
    <div className="grid min-w-0 place-items-center rounded-md border border-line bg-soft p-4">
      {url && !failed ? (
        <img key={attempt} src={url} alt={`${title} preview`} onError={() => setFailed(true)}
          className="mx-auto max-h-[560px] w-full object-contain" />
      ) : (
        <div role="status" className="grid min-h-[280px] content-center justify-items-center gap-3 p-4 text-center text-sm text-muted">
          <p>{failed ? "The stand preview could not be loaded." : "No saved stand preview is available for this order yet."}</p>
          {url ? (
            <button type="button" className="tr-button-ghost" onClick={() => { setFailed(false); setAttempt(attempt + 1); }}>
              <RefreshCw size={16} aria-hidden="true" /> Retry preview
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
