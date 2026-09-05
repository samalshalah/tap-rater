import type { AdminRequestUpdateInput, ChangeLinkFormInput, ContactFormInput, SetupFormInput } from "@/lib/validators";

export type AdminRequestStatus = AdminRequestUpdateInput["status"];

type InsertResult = PromiseLike<{ error: null | { message: string } }>;
type SelectResult = PromiseLike<{ data: unknown[] | null; error: null | { message: string } }>;

export type RequestDbClient = {
  from: (table: string) => {
    insert: (values: Record<string, string>) => InsertResult;
  };
};

export type RequestReadClient = {
  from: (table: string) => {
    select: (columns?: string) => {
      order: (column: string, options: { ascending: boolean }) => SelectResult;
    };
  };
};

export type AdminContactRequest = {
  id: string;
  name: string;
  email: string;
  message: string;
  status: AdminRequestStatus;
  adminNotes: string;
  updatedAt?: string;
  resolvedAt?: string;
  createdAt?: string;
};

export type AdminSetupRequest = {
  id: string;
  name: string;
  email: string;
  businessName: string;
  reviewUrl: string;
  notes: string;
  status: AdminRequestStatus;
  adminNotes: string;
  updatedAt?: string;
  resolvedAt?: string;
  createdAt?: string;
};

export type AdminLinkChangeRequest = {
  id: string;
  name: string;
  email: string;
  tapraterId: string;
  newReviewUrl: string;
  notes: string;
  status: AdminRequestStatus;
  adminNotes: string;
  updatedAt?: string;
  resolvedAt?: string;
  createdAt?: string;
};

export type AdminRequests = {
  contacts: AdminContactRequest[];
  setups: AdminSetupRequest[];
  linkChanges: AdminLinkChangeRequest[];
};

async function insertRequest(client: RequestDbClient, table: string, values: Record<string, string>) {
  const { error } = await client.from(table).insert(values);

  if (error) {
    throw new Error(error.message);
  }
}

export async function saveContactRequest(client: RequestDbClient, input: ContactFormInput) {
  await insertRequest(client, "contact_requests", {
    name: input.name,
    email: input.email,
    message: input.message
  });
}

export async function saveSetupRequest(client: RequestDbClient, input: SetupFormInput) {
  await insertRequest(client, "setup_requests", {
    name: input.name,
    email: input.email,
    business_name: input.businessName,
    review_url: input.reviewUrl,
    notes: input.notes
  });
}

export async function saveChangeLinkRequest(client: RequestDbClient, input: ChangeLinkFormInput) {
  await insertRequest(client, "change_link_requests", {
    name: input.name,
    email: input.email,
    taprater_id: input.tapraterId,
    new_review_url: input.newReviewUrl,
    notes: input.notes
  });
}

export async function getAdminRequestsFromClient(client: RequestReadClient): Promise<AdminRequests> {
  const [contacts, setups, linkChanges] = await Promise.all([
    readTable(client, "contact_requests"),
    readTable(client, "setup_requests"),
    readTable(client, "change_link_requests")
  ]);

  return {
    contacts: contacts.map(normalizeContactRequest),
    setups: setups.map(normalizeSetupRequest),
    linkChanges: linkChanges.map(normalizeLinkChangeRequest)
  };
}

async function readTable(client: RequestReadClient, table: string) {
  let result: { data: unknown[] | null; error: null | { message: string } };

  try {
    result = await client.from(table).select("*").order("created_at", { ascending: false });
  } catch {
    return [];
  }

  const { data, error } = result;

  if (error || !data) {
    return [];
  }

  return data;
}

function normalizeContactRequest(row: unknown): AdminContactRequest {
  const value = readRecord(row);

  return {
    id: readString(value.id) ?? `${readString(value.email) ?? "contact"}-${readString(value.created_at) ?? "unknown"}`,
    name: readString(value.name) ?? "",
    email: readString(value.email) ?? "",
    message: readString(value.message) ?? "",
    status: readRequestStatus(value.status),
    adminNotes: readString(value.admin_notes) ?? "",
    createdAt: readString(value.created_at),
    updatedAt: readString(value.updated_at),
    resolvedAt: readString(value.resolved_at)
  };
}

function normalizeSetupRequest(row: unknown): AdminSetupRequest {
  const value = readRecord(row);

  return {
    id: readString(value.id) ?? `${readString(value.email) ?? "setup"}-${readString(value.created_at) ?? "unknown"}`,
    name: readString(value.name) ?? "",
    email: readString(value.email) ?? "",
    businessName: readString(value.business_name) ?? "",
    reviewUrl: readString(value.review_url) ?? "",
    notes: readString(value.notes) ?? "",
    status: readRequestStatus(value.status),
    adminNotes: readString(value.admin_notes) ?? "",
    createdAt: readString(value.created_at),
    updatedAt: readString(value.updated_at),
    resolvedAt: readString(value.resolved_at)
  };
}

function normalizeLinkChangeRequest(row: unknown): AdminLinkChangeRequest {
  const value = readRecord(row);

  return {
    id: readString(value.id) ?? `${readString(value.email) ?? "change"}-${readString(value.created_at) ?? "unknown"}`,
    name: readString(value.name) ?? "",
    email: readString(value.email) ?? "",
    tapraterId: readString(value.taprater_id) ?? "",
    newReviewUrl: readString(value.new_review_url) ?? "",
    notes: readString(value.notes) ?? "",
    status: readRequestStatus(value.status),
    adminNotes: readString(value.admin_notes) ?? "",
    createdAt: readString(value.created_at),
    updatedAt: readString(value.updated_at),
    resolvedAt: readString(value.resolved_at)
  };
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function readString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function readRequestStatus(value: unknown): AdminRequestStatus {
  if (value === "resolved" || value === "closed" || value === "completed") return "resolved";
  if (value === "in_progress" || value === "open") return "in_progress";
  return "new";
}
