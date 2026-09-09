"use client";

import { Check, Copy, Download, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { fetchOrderFile, saveOrderFile } from "@/lib/order-file-download";

export function OrderDesignFiles({ artworkUrl, originalLogoUrl, printLogoUrl, textUrl, businessName }: {
  artworkUrl?: string;
  originalLogoUrl?: string;
  printLogoUrl?: string;
  textUrl?: string;
  businessName?: string;
}) {
  const [pending, setPending] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const files = [
    { url: artworkUrl, label: "Download design (SVG)", filename: "stand-design.svg" },
    { url: originalLogoUrl, label: "Download original logo", filename: "original-logo.png" },
    { url: printLogoUrl, label: "Download print logo", filename: "print-logo.png" },
    { url: textUrl, label: "Download design text", filename: "design-text.txt" }
  ].filter((file) => file.url);

  return (
    <div className="mt-5 border-t border-line pt-4">
      <h3 className="text-sm font-bold text-ink">Client design files</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {files.map((file) => (
          <a key={file.url} href={file.url} download={file.filename} aria-disabled={Boolean(pending)}
            className={`tr-button-outline min-h-11 gap-2 px-3 py-2 text-sm ${pending ? "opacity-60" : ""}`}
            onClick={async (event) => {
              event.preventDefault();
              if (pending) return;
              setPending(file.url!); setMessage(""); setError("");
              try {
                const result = await fetchOrderFile(file.url!, file.filename);
                saveOrderFile(result.blob, result.filename);
                setMessage("Download started.");
              } catch (error) {
                setError(error instanceof Error ? error.message : "Download failed. Please try again.");
              } finally { setPending(""); }
            }}>
            {pending === file.url ? <LoaderCircle size={16} aria-hidden="true" className="shrink-0 animate-spin" /> : <Download size={16} aria-hidden="true" className="shrink-0" />}
            {file.label}
          </a>
        ))}
        {businessName ? (
          <button type="button" className="tr-button-outline min-h-11 gap-2 px-3 py-2 text-sm" title="Copy business name"
            onClick={async () => {
              setError("");
              try { await navigator.clipboard.writeText(businessName); setCopied(true); setMessage("Business name copied."); }
              catch { setError("Copy is unavailable. Select the business name above or download the design text."); }
            }}>
            {copied ? <Check size={16} aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
            Copy business name
          </button>
        ) : null}
      </div>
      {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
      <p role="status" className="mt-2 text-xs text-muted">{message}</p>
    </div>
  );
}
