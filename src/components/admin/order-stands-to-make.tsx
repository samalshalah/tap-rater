"use client";

import { useState } from "react";
import type { StandToMake } from "@/lib/stand-production";

/**
 * Production list for one order line: one row per physical stand, each with its own print file
 * (same approved design, the stand's own QR) and the link to program on its NFC tag.
 */
export function OrderStandsToMake({ stands, artworkUrl, hasQr }: { stands: StandToMake[]; artworkUrl?: string; hasQr: boolean }) {
  const [copied, setCopied] = useState("");
  if (!stands.length) return null;
  const ownLinks = stands.some((stand) => stand.ownLink);
  const fileUrl = (standId: string) => artworkUrl ? `${artworkUrl}${artworkUrl.includes("?") ? "&" : "?"}stand=${encodeURIComponent(standId)}` : undefined;
  async function copy(value: string) {
    try { await navigator.clipboard.writeText(value); setCopied(value); } catch { setCopied(""); }
  }

  return (
    <details className="mt-3 rounded-lg border border-line bg-white p-3 text-sm" open={ownLinks}>
      <summary className="cursor-pointer font-semibold text-ink">
        Stands to make ({stands.length}){ownLinks ? " · each stand has its own QR and NFC link" : " · all stands share the same link"}
      </summary>
      {ownLinks ? <p className="mt-2 text-xs text-muted">Print each stand with its own file and program its own NFC link, then label the box with the stand number, so the customer&apos;s visit counts are right for every stand.</p> : null}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="uppercase text-muted"><tr><th className="py-1 pr-3">#</th><th className="py-1 pr-3">Stand ID</th><th className="py-1 pr-3">Name</th>{hasQr ? <th className="py-1 pr-3">Print file</th> : null}<th className="py-1">NFC link</th></tr></thead>
          <tbody>
            {stands.map((stand) => (
              <tr key={stand.standId} className="border-t border-line align-top">
                <td className="py-2 pr-3 font-semibold text-ink">{stand.unitNumber}</td>
                <td className="py-2 pr-3 font-mono break-all">{stand.standId}</td>
                <td className="py-2 pr-3">{stand.label || <span className="text-muted">Not named yet</span>}</td>
                {hasQr ? <td className="py-2 pr-3">{stand.ownLink && fileUrl(stand.standId) ? <a className="font-semibold text-brand underline" href={fileUrl(stand.standId)} download>Download</a> : <span className="text-muted">{artworkUrl ? "Use the line's file" : "Not ready"}</span>}</td> : null}
                <td className="py-2">{stand.nfcUrl ? <span className="flex items-center gap-2"><span className="break-all font-mono">{stand.nfcUrl}</span><button type="button" className="shrink-0 font-semibold text-brand hover:underline" onClick={() => void copy(stand.nfcUrl!)}>{copied === stand.nfcUrl ? "Copied" : "Copy"}</button></span> : <span className="text-muted">—</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
