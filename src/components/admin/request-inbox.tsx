"use client";

import { Mail, Save, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import type { AdminRequestType } from "@/lib/admin-requests";
import type {
  AdminContactRequest,
  AdminLinkChangeRequest,
  AdminRequests,
  AdminRequestStatus,
  AdminSetupRequest
} from "@/lib/request-repository";
import {
  AdminAlert,
  AdminBadge,
  AdminButton,
  AdminCard,
  AdminInput,
  AdminSelect,
  AdminTextarea
} from "./admin-ui";

type RequestTab = "contacts" | "setups" | "linkChanges";
type RequestFilter = "open" | "resolved" | "all";

const tabs: { id: RequestTab; label: string }[] = [
  { id: "contacts", label: "Contact Requests" },
  { id: "setups", label: "Setup Requests" },
  { id: "linkChanges", label: "Link Change Requests" }
];

export function RequestInbox({ requests }: { requests: AdminRequests }) {
  const [activeTab, setActiveTab] = useState<RequestTab>("contacts");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<RequestFilter>("open");

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return {
      contacts: requests.contacts.filter((request) =>
        matchesRequestFilter(request, statusFilter) && matchesSearch(normalizedQuery, request.name, request.email, request.message, request.adminNotes)
      ),
      setups: requests.setups.filter((request) =>
        matchesRequestFilter(request, statusFilter) && matchesSearch(normalizedQuery, request.name, request.email, request.businessName, request.reviewUrl, request.notes, request.adminNotes)
      ),
      linkChanges: requests.linkChanges.filter((request) =>
        matchesRequestFilter(request, statusFilter) && matchesSearch(normalizedQuery, request.name, request.email, request.tapraterId, request.newReviewUrl, request.notes, request.adminNotes)
      )
    };
  }, [query, requests, statusFilter]);

  return (
    <div className="grid gap-6">
      <AdminCard className="grid gap-4 xl:grid-cols-[1fr_auto_auto] xl:items-center">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <AdminInput
            className="py-3 pl-11 pr-4"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search customer, business, URL, or internal note"
          />
        </label>
        <AdminSelect
          aria-label="Filter requests by status"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as RequestFilter)}
          className="w-full xl:w-44"
        >
          <option value="open">Open work</option>
          <option value="resolved">Resolved</option>
          <option value="all">All requests</option>
        </AdminSelect>
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const count = filtered[tab.id].length;
            const isActive = activeTab === tab.id;
            return (
              <AdminButton key={tab.id} variant={isActive ? "primary" : "outline"} onClick={() => setActiveTab(tab.id)} type="button">
                {tab.label} <span className="ml-1 text-xs opacity-75">{count}</span>
              </AdminButton>
            );
          })}
        </div>
      </AdminCard>

      {activeTab === "contacts" ? <ContactRequests rows={filtered.contacts} /> : null}
      {activeTab === "setups" ? <SetupRequests rows={filtered.setups} /> : null}
      {activeTab === "linkChanges" ? <LinkChangeRequests rows={filtered.linkChanges} /> : null}
    </div>
  );
}

function ContactRequests({ rows }: { rows: AdminContactRequest[] }) {
  return (
    <RequestSection title="Contact Requests" count={rows.length}>
      {rows.map((row) => (
        <RequestCard key={row.id} requestType="contact" row={row}>
          <Field label="Message" value={row.message} multiline />
        </RequestCard>
      ))}
    </RequestSection>
  );
}

function SetupRequests({ rows }: { rows: AdminSetupRequest[] }) {
  return (
    <RequestSection title="Setup Requests" count={rows.length}>
      {rows.map((row) => (
        <RequestCard key={row.id} requestType="setup" row={row}>
          <Field label="Business" value={row.businessName} />
          <Field label="Review URL" value={row.reviewUrl} link />
          <Field label="Notes" value={row.notes} multiline />
        </RequestCard>
      ))}
    </RequestSection>
  );
}

function LinkChangeRequests({ rows }: { rows: AdminLinkChangeRequest[] }) {
  return (
    <RequestSection title="Link Change Requests" count={rows.length}>
      {rows.map((row) => (
        <RequestCard key={row.id} requestType="link-change" row={row}>
          <Field label="Tap Rater ID" value={row.tapraterId} />
          <Field label="New review URL" value={row.newReviewUrl} link />
          <Field label="Notes" value={row.notes} multiline />
        </RequestCard>
      ))}
    </RequestSection>
  );
}

function RequestSection({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  return (
    <section>
      <div className="flex flex-col gap-1 md:flex-row md:items-end md:justify-between">
        <h2 className="text-2xl font-black text-ink">{title}</h2>
        <p className="text-sm font-semibold text-muted">{count} shown</p>
      </div>
      <div className="mt-4 grid gap-4">
        {count === 0 ? <AdminCard><p className="text-sm text-muted">No matching requests.</p></AdminCard> : children}
      </div>
    </section>
  );
}

type RequestCardRow = Pick<
  AdminContactRequest,
  "id" | "name" | "email" | "status" | "adminNotes" | "createdAt" | "updatedAt" | "resolvedAt"
>;

function RequestCard({ requestType, row, children }: { requestType: AdminRequestType; row: RequestCardRow; children: ReactNode }) {
  const router = useRouter();
  const [status, setStatus] = useState(row.status);
  const [adminNotes, setAdminNotes] = useState(row.adminNotes);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function saveOperations() {
    setSaving(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch(`/api/admin/requests/${requestType}/${encodeURIComponent(row.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status, adminNotes })
      });
      const body = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(body?.error ?? "Request update could not be saved.");
      setMessage("Request operations saved.");
      router.refresh();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Request update could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminCard>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-black text-ink">{row.name || "Unknown customer"}</h3>
            <RequestStatusBadge status={status} />
          </div>
          <a className="mt-1 inline-flex items-center gap-2 text-sm font-bold text-brand" href={`mailto:${row.email}`}>
            <Mail size={15} aria-hidden="true" />
            {row.email}
          </a>
        </div>
        <div className="text-sm text-muted lg:text-right">
          <p>Received {formatDate(row.createdAt)}</p>
          {row.resolvedAt ? <p className="mt-1">Resolved {formatDate(row.resolvedAt)}</p> : null}
          <a className="mt-2 inline-block font-bold text-ink" href={`mailto:${row.email}`}>Follow up</a>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">{children}</div>

      <div className="mt-5 grid gap-4 border-t border-line pt-5 lg:grid-cols-[220px_1fr_auto] lg:items-end">
        <label className="block text-sm font-semibold text-ink">
          Work status
          <AdminSelect value={status} onChange={(event) => setStatus(event.target.value as AdminRequestStatus)} className="mt-2">
            <option value="new">New</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
          </AdminSelect>
        </label>
        <label className="block text-sm font-semibold text-ink">
          Internal notes
          <AdminTextarea
            value={adminNotes}
            onChange={(event) => setAdminNotes(event.target.value)}
            rows={2}
            maxLength={2000}
            className="mt-2"
            placeholder="Record follow-up, resolution, or next action"
          />
        </label>
        <AdminButton type="button" onClick={saveOperations} disabled={saving} loading={saving} className="w-full lg:w-auto">
          <Save className="h-4 w-4" aria-hidden="true" />
          Save
        </AdminButton>
      </div>
      {message ? <AdminAlert tone="success" className="mt-4">{message}</AdminAlert> : null}
      {error ? <AdminAlert tone="danger" className="mt-4">{error}</AdminAlert> : null}
    </AdminCard>
  );
}

function RequestStatusBadge({ status }: { status: AdminRequestStatus }) {
  const tone = status === "resolved" ? "success" : status === "in_progress" ? "warning" : "brand";
  return <AdminBadge tone={tone}>{status === "in_progress" ? "In progress" : status === "resolved" ? "Resolved" : "New"}</AdminBadge>;
}

function Field({ label, value, link = false, multiline = false }: { label: string; value: string; link?: boolean; multiline?: boolean }) {
  if (!value) return null;
  const safeUrl = link ? getSafeHttpUrl(value) : null;

  return (
    <div className={multiline ? "md:col-span-2" : ""}>
      <p className="text-xs font-black uppercase text-muted">{label}</p>
      {safeUrl ? (
        <a className="mt-1 block break-words text-sm font-semibold text-brand" href={safeUrl} target="_blank" rel="noreferrer">{value}</a>
      ) : (
        <p className="mt-1 break-words text-sm leading-6 text-ink">{value}</p>
      )}
    </div>
  );
}

function matchesRequestFilter(request: { status: AdminRequestStatus }, filter: RequestFilter) {
  if (filter === "all") return true;
  return filter === "resolved" ? request.status === "resolved" : request.status !== "resolved";
}

function matchesSearch(query: string, ...values: string[]) {
  return !query || values.some((value) => value.toLowerCase().includes(query));
}

function getSafeHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function formatDate(value?: string) {
  if (!value) return "date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "date unavailable" : date.toLocaleString();
}
