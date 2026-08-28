"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Mail, Search } from "lucide-react";
import type { AdminContactRequest, AdminLinkChangeRequest, AdminRequests, AdminSetupRequest } from "@/lib/request-repository";
import { AdminBadge, AdminButton, AdminCard, AdminInput } from "./admin-ui";

type RequestTab = "contacts" | "setups" | "linkChanges";

const tabs: { id: RequestTab; label: string }[] = [
  { id: "contacts", label: "Contact Requests" },
  { id: "setups", label: "Setup Requests" },
  { id: "linkChanges", label: "Link Change Requests" }
];

export function RequestInbox({ requests }: { requests: AdminRequests }) {
  const [activeTab, setActiveTab] = useState<RequestTab>("contacts");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return requests;
    }

    return {
      contacts: requests.contacts.filter((request) => matchesSearch(normalizedQuery, request.name, request.email, request.message)),
      setups: requests.setups.filter((request) =>
        matchesSearch(normalizedQuery, request.name, request.email, request.businessName, request.reviewUrl, request.notes)
      ),
      linkChanges: requests.linkChanges.filter((request) =>
        matchesSearch(normalizedQuery, request.name, request.email, request.tapraterId, request.newReviewUrl, request.notes)
      )
    };
  }, [query, requests]);

  return (
    <div className="grid gap-6">
      <AdminCard className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <AdminInput
            className="py-3 pl-11 pr-4"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, email, business, Tap Rater ID, or URL"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const count = filtered[tab.id].length;
            const isActive = activeTab === tab.id;

            return (
              <AdminButton
                key={tab.id}
                variant={isActive ? "primary" : "outline"}
                onClick={() => setActiveTab(tab.id)}
                type="button"
              >
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
        <RequestCard key={row.id} name={row.name} email={row.email} status={row.status} createdAt={row.createdAt}>
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
        <RequestCard key={row.id} name={row.name} email={row.email} status={row.status} createdAt={row.createdAt}>
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
        <RequestCard key={row.id} name={row.name} email={row.email} status={row.status} createdAt={row.createdAt}>
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

function RequestCard({
  name,
  email,
  status,
  createdAt,
  children
}: {
  name: string;
  email: string;
  status?: string;
  createdAt?: string;
  children: ReactNode;
}) {
  return (
    <AdminCard>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-black text-ink">{name || "Unknown customer"}</h3>
            {status ? <AdminBadge tone="neutral">{status}</AdminBadge> : null}
          </div>
          <a className="mt-1 inline-flex items-center gap-2 text-sm font-bold text-brand" href={`mailto:${email}`}>
            <Mail size={15} />
            {email}
          </a>
        </div>
        <div className="text-sm text-muted lg:text-right">
          <p>{formatDate(createdAt)}</p>
          <a className="mt-2 inline-block font-bold text-ink" href={`mailto:${email}`}>
            Follow up
          </a>
        </div>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">{children}</div>
    </AdminCard>
  );
}

function Field({ label, value, link = false, multiline = false }: { label: string; value: string; link?: boolean; multiline?: boolean }) {
  if (!value) {
    return null;
  }

  return (
    <div className={multiline ? "md:col-span-2" : ""}>
      <p className="text-xs font-black uppercase text-muted">{label}</p>
      {link ? (
        <a className="mt-1 block break-words text-sm font-semibold text-brand" href={value} target="_blank" rel="noreferrer">
          {value}
        </a>
      ) : (
        <p className="mt-1 break-words text-sm leading-6 text-ink">{value}</p>
      )}
    </div>
  );
}

function matchesSearch(query: string, ...values: string[]) {
  return values.some((value) => value.toLowerCase().includes(query));
}

function formatDate(value?: string) {
  if (!value) {
    return "Date unavailable";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleString();
}
