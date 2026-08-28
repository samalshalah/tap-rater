"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, Import, Plus } from "lucide-react";

type ImportSummary = {
  ok: boolean;
  totalRows: number;
  validRows: number;
  createCount: number;
  updateCount: number;
  errors: { row: number; message: string }[];
  created?: number;
  updated?: number;
  skipped?: number;
};

export function AdminProductCsvActions({ canImportExport }: { canImportExport: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-4 py-3 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!canImportExport}
        onClick={() => setOpen(true)}
      >
        <Import className="h-4 w-4" aria-hidden="true" />
        Import CSV
      </button>
      <a
        href="/api/admin/products/export"
        className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-4 py-3 text-sm font-semibold text-ink aria-disabled:pointer-events-none aria-disabled:opacity-50"
        aria-disabled={!canImportExport}
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        Export CSV
      </a>
      <Link href="/admin/products/new" className="inline-flex items-center gap-2 rounded-md bg-brand px-5 py-3 text-sm font-semibold text-white">
        <Plus className="h-4 w-4" aria-hidden="true" />
        Create product
      </Link>
      {open ? <ImportProductsModal onClose={() => setOpen(false)} /> : null}
    </div>
  );
}

function ImportProductsModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(mode: "validate" | "apply") {
    if (!file || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.set("mode", mode);
      formData.set("file", file);
      const response = await fetch("/api/admin/products/import", { method: "POST", body: formData });
      const payload = (await response.json().catch(() => null)) as (Partial<ImportSummary> & { error?: string }) | null;
      if (!response.ok || !payload || payload.error) {
        throw new Error(payload?.error ?? "CSV import could not be processed.");
      }
      setSummary(payload as ImportSummary);
      if (mode === "apply") {
        setMessage("Import complete");
        router.refresh();
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "CSV import could not be processed.");
    } finally {
      setBusy(false);
    }
  }

  function selectFile(nextFile: File | undefined) {
    setFile(nextFile ?? null);
    setSummary(null);
    setMessage(null);
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/50 p-4" role="dialog" aria-modal="true" aria-labelledby="import-products-title">
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="import-products-title" className="text-2xl font-black text-ink">
              Import Products
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Upload a Tap Rater product CSV to create new products or update existing products.
            </p>
          </div>
          <button type="button" className="rounded-md border border-line px-3 py-2 text-sm font-bold text-ink" onClick={onClose}>
            Close
          </button>
        </div>

        <div
          className="mt-5 rounded-lg border border-dashed border-line bg-[#f7f8fa] p-8 text-center"
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            selectFile(event.dataTransfer.files[0]);
          }}
        >
          <p className="text-sm font-semibold text-ink">{file ? file.name : "Drag and drop a CSV file here."}</p>
          <button
            type="button"
            className="mt-4 rounded-md bg-ink px-4 py-2 text-sm font-bold text-white"
            onClick={() => inputRef.current?.click()}
          >
            Choose CSV File
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(event) => selectFile(event.target.files?.[0])}
          />
          <a className="mt-4 block text-sm font-bold text-brand" href="/api/admin/products/export?template=1">
            Download CSV Template
          </a>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="rounded-md border border-line px-4 py-2 text-sm font-bold text-ink disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!file || busy}
            onClick={() => submit("validate")}
          >
            Parse and validate
          </button>
          <button
            type="button"
            className="rounded-md bg-brand px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!file || busy || !summary?.ok}
            onClick={() => submit("apply")}
          >
            Import Products
          </button>
          {summary?.created !== undefined || message === "Import complete" ? (
            <button type="button" className="rounded-md border border-line px-4 py-2 text-sm font-bold text-ink" onClick={onClose}>
              Done
            </button>
          ) : null}
        </div>

        {message ? <p className="mt-4 rounded-md bg-teal-50 p-3 text-sm font-bold text-brand">{message}</p> : null}
        {summary ? <ImportSummaryPanel summary={summary} fileName={file?.name ?? ""} /> : null}
      </div>
    </div>
  );
}

function ImportSummaryPanel({ summary, fileName }: { summary: ImportSummary; fileName: string }) {
  return (
    <div className="mt-5 rounded-lg border border-line p-4">
      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <SummaryLine label="File" value={fileName} />
        <SummaryLine label="Rows" value={String(summary.totalRows)} />
        <SummaryLine label="New products" value={String(summary.createCount)} />
        <SummaryLine label="Products to update" value={String(summary.updateCount)} />
        <SummaryLine label="Valid rows" value={String(summary.validRows)} />
        <SummaryLine label="Errors" value={String(summary.errors.length)} />
        {summary.created !== undefined ? <SummaryLine label="Created" value={String(summary.created)} /> : null}
        {summary.updated !== undefined ? <SummaryLine label="Updated" value={String(summary.updated)} /> : null}
      </div>
      {summary.errors.length > 0 ? (
        <div className="mt-4 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700">
          {summary.errors.map((error) => (
            <p key={`${error.row}-${error.message}`}>
              Row {error.row} - {error.message}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span className="font-bold text-muted">{label}: </span>
      <span className="font-semibold text-ink">{value}</span>
    </p>
  );
}
