"use client";

import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { useRouter } from "next/navigation";
import { Download, Import, Plus } from "lucide-react";
import { AdminAlert, AdminButton, AdminExternalButton, AdminLinkButton } from "./admin-ui";

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
  const importButtonRef = useRef<HTMLButtonElement>(null);

  function closeModal() {
    setOpen(false);
    window.requestAnimationFrame(() => importButtonRef.current?.focus());
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <AdminButton
        ref={importButtonRef}
        type="button"
        variant="outline"
        disabled={!canImportExport}
        onClick={() => setOpen(true)}
      >
        <Import className="h-4 w-4" aria-hidden="true" />
        Import CSV
      </AdminButton>
      <AdminExternalButton
        href="/api/admin/products/export"
        variant="outline"
        disabled={!canImportExport}
      >
        <Download className="h-4 w-4" aria-hidden="true" />
        Export CSV
      </AdminExternalButton>
      <AdminLinkButton href="/admin/products/new" variant="secondary">
        <Plus className="h-4 w-4" aria-hidden="true" />
        Create product
      </AdminLinkButton>
      {open ? <ImportProductsModal onClose={closeModal} /> : null}
    </div>
  );
}

function ImportProductsModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = modalRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [busy, onClose]);

  useEffect(() => {
    if (summary && !summary.ok) {
      summaryRef.current?.focus();
    }
  }, [summary]);

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
      if (mode === "validate" && payload.errors && payload.errors.length > 0) {
        window.requestAnimationFrame(() => summaryRef.current?.focus());
      }
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
      <div ref={modalRef} className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="import-products-title" className="text-2xl font-semibold text-ink">
              Import Products
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Upload a Tap Rater product CSV to create new products or update existing products.
            </p>
          </div>
          <AdminButton ref={closeButtonRef} type="button" variant="outline" onClick={onClose}>
            Close
          </AdminButton>
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
          {file ? <p className="mt-1 text-xs font-semibold text-muted">Selected file</p> : null}
          <AdminButton
            type="button"
            className="mt-4"
            variant="primary"
            onClick={() => inputRef.current?.click()}
          >
            Choose CSV File
          </AdminButton>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(event) => selectFile(event.target.files?.[0])}
          />
          <a className="mt-4 block text-sm font-semibold text-brand" href="/api/admin/products/export?template=1">
            Download CSV Template
          </a>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <AdminButton
            type="button"
            variant="outline"
            loading={busy}
            disabled={!file || busy}
            onClick={() => submit("validate")}
          >
            Parse and validate
          </AdminButton>
          <AdminButton
            type="button"
            variant="secondary"
            loading={busy}
            disabled={!file || busy || !summary?.ok}
            onClick={() => submit("apply")}
          >
            Import Products
          </AdminButton>
          {summary?.created !== undefined || message === "Import complete" ? (
            <AdminButton type="button" variant="outline" onClick={onClose}>
              Done
            </AdminButton>
          ) : null}
        </div>

        {message ? <AdminAlert className="mt-4" tone={message === "Import complete" ? "success" : "danger"}>{message}</AdminAlert> : null}
        {summary ? <ImportSummaryPanel summaryRef={summaryRef} summary={summary} fileName={file?.name ?? ""} /> : null}
      </div>
    </div>
  );
}

function ImportSummaryPanel({ summary, fileName, summaryRef }: { summary: ImportSummary; fileName: string; summaryRef: RefObject<HTMLDivElement | null> }) {
  return (
    <div ref={summaryRef} className="mt-5 rounded-lg border border-line p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand" tabIndex={summary.errors.length > 0 ? -1 : undefined}>
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
        <div className="mt-4 rounded-md bg-red-50 p-3 text-sm font-semibold text-red-700" aria-live="polite">
          <p className="mb-2 font-semibold">Validation errors</p>
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
