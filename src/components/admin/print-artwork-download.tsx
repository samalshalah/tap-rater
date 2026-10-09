"use client";

import { useState } from "react";
import { Download, LoaderCircle } from "lucide-react";
import { fetchOrderFile, saveOrderFile } from "@/lib/order-file-download";
import { createPrintPng } from "@/lib/print-png";

export function PrintArtworkDownload({ url, standard = false }: { url: string; standard?: boolean }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  return <div>
    <button type="button" disabled={pending} className="tr-button-primary min-h-11 gap-2 px-3 py-2 text-sm" onClick={async () => {
      setPending(true); setError(""); setMessage("");
      try {
        const file = await fetchOrderFile(url, standard ? "standard-design.png" : "stand-design.svg");
        const png = await createPrintPng(file.blob);
        saveOrderFile(png, file.filename.replace(/\.[^.]+$/, "") + "-300dpi.png");
        setMessage("300-DPI PNG download started.");
      } catch (error) { setError(error instanceof Error ? error.message : "PNG download failed. Please try again."); }
      finally { setPending(false); }
    }}>
      {pending ? <LoaderCircle size={16} className="animate-spin" aria-hidden="true" /> : <Download size={16} aria-hidden="true" />}
      {pending ? "Preparing PNG…" : standard ? "Download standard design PNG (300 DPI)" : "Download artwork PNG (300 DPI)"}
    </button>
    {error ? <p role="alert" className="mt-2 text-sm text-red-700">{error}</p> : null}
    {message ? <p role="status" className="mt-2 text-xs text-muted">{message}</p> : null}
  </div>;
}
