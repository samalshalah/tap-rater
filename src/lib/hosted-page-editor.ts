import { HostedPageEditorError, buildSnapshotFromDraft, renderHostedPageDraftPreview, validateHostedPageEditorDraft, readRecord, readString } from "./hosted-page-editor-draft";
export { HostedPageEditorError, buildSnapshotFromDraft, renderHostedPageDraftPreview, validateHostedPageEditorDraft } from "./hosted-page-editor-draft";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { getSupabaseAdmin, hasSupabaseAdminConfig } from "@/lib/db";
import {
  hostedPageButtonLimit,
  supportedHostedPageButtons,
  type HostedPageEditorAppearance,
  type HostedPageEditorButton,
  type HostedPageEditorButtonType,
  type HostedPageEditorDraft,
  type HostedPageEditorRecord
} from "@/lib/hosted-page-editor-shared";
import { assignPermanentHostedPageCode, publishHostedPageSnapshot, readHostedPageAssignment, HostedPageRepositoryError, type HostedPageTextStorage } from "@/lib/hosted-pages/repository";
import { type HostedPageLifecycleStatus, type HostedPageSnapshot } from "@/lib/hosted-pages/snapshots";

export { hostedPageButtonLimit, supportedHostedPageButtons };
export type { HostedPageEditorAppearance, HostedPageEditorButton, HostedPageEditorButtonType, HostedPageEditorDraft, HostedPageEditorRecord };

export type HostedPageEditorContext =
  | { configured: false; page: null; message: string }
  | { configured: true; page: HostedPageEditorRecord | null; message?: string };

export type HostedPageEditorDbClient = {
  from: (table: string) => any;
};

export function getLocalHostedPageEditorFileFromEnv(env: Record<string, string | undefined> = process.env) {
  if (env.NODE_ENV === "production") return undefined;
  const value = env.TAP_RATER_LOCAL_HOSTED_EDITOR_FILE?.trim();
  return value ? resolve(value) : undefined;
}

export function isHostedPageEditorConfigured() {
  return hasSupabaseAdminConfig() || Boolean(getLocalHostedPageEditorFileFromEnv());
}

export async function getHostedPageEditorContext(email: string, code?: string): Promise<HostedPageEditorContext> {
  const localFile = getLocalHostedPageEditorFileFromEnv();
  if (localFile) return getHostedPageEditorContextFromLocalFile(localFile, email, code);

  if (!hasSupabaseAdminConfig()) {
    return { configured: false, page: null, message: "Hosted page editor storage is not configured yet." };
  }

  return getHostedPageEditorContextFromClient(getSupabaseAdmin() as HostedPageEditorDbClient, email, code);
}

export async function saveHostedPageDraft(email: string, draftInput: unknown, code?: string, expectedVersion?: number): Promise<HostedPageEditorRecord> {
  const draft = validateHostedPageEditorDraft(draftInput);
  const localFile = getLocalHostedPageEditorFileFromEnv();
  if (localFile) return updateLocalHostedPage(localFile, email, { draft }, code, expectedVersion);

  if (!hasSupabaseAdminConfig()) {
    throw new HostedPageEditorError("Hosted page editor storage is not configured.", 503);
  }

  const context = await getHostedPageEditorContextFromClient(getSupabaseAdmin() as HostedPageEditorDbClient, email, code);
  if (!context.page) throw new HostedPageEditorError("Hosted page was not found for this account.", 404);
  const draftVersion=await updateHostedPageDraftWithClient(getSupabaseAdmin() as HostedPageEditorDbClient, context.page.id, context.page.customerId, draft, expectedVersion ?? context.page.draftVersion ?? 0);
  return { ...context.page, businessName: draft.businessName, draft, draftVersion, updatedAt: new Date().toISOString() };
}

export async function publishHostedPageDraft(email: string, storage: HostedPageTextStorage, code?: string, expectedVersion?:number): Promise<{ page: HostedPageEditorRecord; snapshot: HostedPageSnapshot }> {
  const context = await getHostedPageEditorContext(email, code);
  if (!context.configured) throw new HostedPageEditorError(context.message, 503);
  if (!context.page) throw new HostedPageEditorError("Hosted page was not found for this account.", 404);

  if(expectedVersion!==undefined&&(context.page.draftVersion??0)!==expectedVersion)throw new HostedPageEditorError("This draft changed. Close and reopen the editor before publishing.",409);
  const snapshot = buildSnapshotFromDraft(context.page);
  if (!getLocalHostedPageEditorFileFromEnv()) {
    const {data, error} = await getSupabaseAdmin().from("hosted_subscriptions").select("stripe_subscription_id,current_period_end,status").eq("customer_id", context.page.customerId).eq("hosted_page_id", context.page.id);
    if (error) throw new HostedPageEditorError("Licence could not be verified. Try again.", 503);
    const grant = Array.isArray(data) ? data.find(row => String(row.stripe_subscription_id).startsWith("admin:")) : undefined;
    if (grant) {
      if (grant.status !== "active" || (grant.current_period_end && Date.parse(grant.current_period_end) <= Date.now())) throw new HostedPageEditorError("This Multi-Link licence has expired.", 403);
      if (grant.current_period_end) {
        snapshot.lifecycleStatus = "CANCELLED_AT_PERIOD_END";
        snapshot.subscriptionPaidThrough = grant.current_period_end;
      }
    }
  }
  await ensureHostedPageCodeIsAssigned(storage, context.page);
  await publishHostedPageSnapshot(storage, snapshot);

  const page = await markHostedPagePublished(email, snapshot.version, snapshot.publishedAt, code);
  return { page, snapshot };
}

async function ensureHostedPageCodeIsAssigned(storage: HostedPageTextStorage, page: HostedPageEditorRecord) {
  try {
    await assignPermanentHostedPageCode(storage, {
      physicalProductRef: page.id,
      code: page.code,
      assignedBy: `customer:${page.customerId}`
    });
    return;
  } catch (error) {
    if (!(error instanceof HostedPageRepositoryError) || !error.message.includes("already assigned")) {
      throw error;
    }
  }

  const existingAssignment = await readHostedPageAssignment(storage, page.code);
  if (!existingAssignment) {
    throw new HostedPageEditorError("Hosted page code could not be confirmed before publishing.", 500);
  }
}

export async function getHostedPageEditorContextFromClient(client: HostedPageEditorDbClient, email: string, code?: string): Promise<HostedPageEditorContext> {
  const normalizedEmail = normalizeEmail(email);
  const { data: customerRow, error: customerError } = await client.from("customers").select("*").eq("email", normalizedEmail).maybeSingle();
  const customer = normalizeCustomer(customerRow);
  if (customerError || !customer) return { configured: true, page: null, message: "No customer record was found for this email." };

  const pageQuery = client
    .from("hosted_page_editor_pages")
    .select("*")
    .eq("customer_id", customer.id)
    .order("created_at", { ascending: true });
  if (code) pageQuery.eq("code", code);
  const { data: pageRows, error: pageError } = await pageQuery.limit(1);
  if (pageError) throw new HostedPageEditorError(pageError.message ?? "Hosted page could not be loaded.", 500);

  const pageRow = Array.isArray(pageRows) ? pageRows[0] : undefined;
  if (!pageRow) return { configured: true, page: null, message: "No hosted page was found for this account." };

  const { data: businessRow } = await client.from("businesses").select("*").eq("id", readString(readRecord(pageRow).business_id, 120) ?? "").maybeSingle();
  const page = normalizeEditorPage(pageRow, customer, businessRow);
  return { configured: true, page };
}

export async function updateHostedPageDraftWithClient(client: HostedPageEditorDbClient, pageId: string, customerId: string, draft: HostedPageEditorDraft, version:number) {
  const { data,error } = await client
    .from("hosted_page_editor_pages")
    .update({
      draft_json: draft,
      draft_version: version+1,
      updated_at: new Date().toISOString()
    })
    .eq("id", pageId)
    .eq("customer_id", customerId).eq("draft_version",version).select("id,draft_version").maybeSingle();

  if (error) throw new HostedPageEditorError("Draft could not be saved.", 500);
  if (!data) throw new HostedPageEditorError("This page was changed in another tab. Close and reopen the editor before saving.",409);
  return Number(data.draft_version);
}

async function markHostedPagePublished(email: string, version: string, publishedAt: string, code?: string) {
  const localFile = getLocalHostedPageEditorFileFromEnv();
  if (localFile) {
    return updateLocalHostedPage(localFile, email, { publishedVersion: version, publishedAt }, code);
  }

  const context = await getHostedPageEditorContext(email, code);
  if (!context.configured || !context.page) throw new HostedPageEditorError("Hosted page was not found for this account.", 404);

  const { error } = await getSupabaseAdmin()
    .from("hosted_page_editor_pages")
    .update({
      published_version: version,
      published_at: publishedAt,
      updated_at: new Date().toISOString()
    })
    .eq("id", context.page.id)
    .eq("customer_id", context.page.customerId);

  if (error) throw new HostedPageEditorError(error.message ?? "Publish metadata could not be saved.", 500);
  return { ...context.page, publishedVersion: version, publishedAt };
}

async function getHostedPageEditorContextFromLocalFile(filePath: string, email: string, code?: string): Promise<HostedPageEditorContext> {
  const store = await readLocalStore(filePath);
  const normalizedEmail = normalizeEmail(email);
  const customer = store.customers.find((row) => normalizeEmail(String(row.email ?? "")) === normalizedEmail);
  if (!customer) return { configured: true, page: null, message: "No hosted page was found for this account." };

  const pageRow = store.hosted_page_editor_pages.find((row) => row.customer_id === customer.id && (!code || row.code === code));
  if (!pageRow) return { configured: true, page: null, message: "No hosted page was found for this account." };

  const business = store.businesses.find((row) => row.id === pageRow.business_id);
  return { configured: true, page: normalizeEditorPage(pageRow, normalizeCustomer(customer)!, business) };
}

async function updateLocalHostedPage(filePath: string, email: string, patch: { draft?: HostedPageEditorDraft; businessName?: string; publishedVersion?: string; publishedAt?: string }, code?: string, expectedVersion?:number) {
  const store = await readLocalStore(filePath);
  const normalizedEmail = normalizeEmail(email);
  const customer = store.customers.find((row) => normalizeEmail(String(row.email ?? "")) === normalizedEmail);
  if (!customer) throw new HostedPageEditorError("Hosted page was not found for this account.", 404);
  const pageIndex = store.hosted_page_editor_pages.findIndex((row) => row.customer_id === customer.id && (!code || row.code === code));
  if (pageIndex === -1) throw new HostedPageEditorError("Hosted page was not found for this account.", 404);

  const page = store.hosted_page_editor_pages[pageIndex];
  if(patch.draft && expectedVersion!==undefined && Number(page.draft_version||0)!==expectedVersion)throw new HostedPageEditorError("This page was changed in another tab. Close and reopen the editor before saving.",409);
  store.hosted_page_editor_pages[pageIndex] = {
    ...page,
    draft_json: patch.draft ?? page.draft_json,
    draft_version: Number(page.draft_version||0)+(patch.draft?1:0),
    published_version: patch.publishedVersion ?? page.published_version,
    published_at: patch.publishedAt ?? page.published_at,
    updated_at: new Date().toISOString()
  };

  const businessIndex = store.businesses.findIndex((row) => row.id === page.business_id);
  if (businessIndex !== -1 && patch.businessName) {
    store.businesses[businessIndex] = { ...store.businesses[businessIndex], business_name: patch.businessName, updated_at: new Date().toISOString() };
  }

  await writeLocalStore(filePath, store);
  const business = store.businesses.find((row) => row.id === page.business_id);
  return normalizeEditorPage(store.hosted_page_editor_pages[pageIndex], normalizeCustomer(customer)!, business);
}

async function readLocalStore(filePath: string): Promise<LocalHostedPageEditorStore> {
  try {
    const parsed = JSON.parse(await readFile(filePath, "utf8"));
    return normalizeLocalStore(parsed);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    const seed = createDefaultLocalStore();
    await writeLocalStore(filePath, seed);
    return seed;
  }
}

async function writeLocalStore(filePath: string, store: LocalHostedPageEditorStore) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

type LocalHostedPageEditorStore = {
  customers: Array<Record<string, unknown>>;
  businesses: Array<Record<string, unknown>>;
  hosted_page_editor_pages: Array<Record<string, unknown>>;
};

function normalizeLocalStore(value: unknown): LocalHostedPageEditorStore {
  const record = readRecord(value);
  return {
    customers: Array.isArray(record.customers) ? record.customers.filter(isRecord) : [],
    businesses: Array.isArray(record.businesses) ? record.businesses.filter(isRecord) : [],
    hosted_page_editor_pages: Array.isArray(record.hosted_page_editor_pages) ? record.hosted_page_editor_pages.filter(isRecord) : []
  };
}

function createDefaultLocalStore(): LocalHostedPageEditorStore {
  const email = normalizeEmail(process.env.ADMIN_EMAIL || "qa-customer@example.com");
  const now = new Date().toISOString();
  const draft = validateHostedPageEditorDraft({
    businessName: "Tap Rater Hosted QA",
    headline: "Choose your next step",
    description: "QA hosted page draft.",
    appearance: { theme: "light", accentColor: "#0f766e" },
    buttons: [
      { id: "google-review", type: "google_review", label: "Google Review", url: "https://example.com/google-review", enabled: true, position: 0 },
      { id: "website", type: "website", label: "Website", url: "https://example.com", enabled: true, position: 1 },
      { id: "instagram", type: "instagram", label: "Instagram", url: "https://example.com/instagram", enabled: false, position: 2 }
    ]
  });

  return {
    customers: [{ id: "qa-customer", email, name: "QA Customer" }],
    businesses: [{ id: "qa-business", customer_id: "qa-customer", business_name: draft.businessName, status: "active", created_at: now, updated_at: now }],
    hosted_page_editor_pages: [
      {
        id: "qa-hosted-page",
        customer_id: "qa-customer",
        business_id: "qa-business",
        code: "ABCDEFGHJKM2",
        lifecycle_status: "ACTIVE",
        draft_json: draft,
        published_version: null,
        published_at: null,
        created_at: now,
        updated_at: now
      }
    ]
  };
}

function normalizeEditorPage(row: unknown, customer: { id: string; email: string }, businessRow: unknown): HostedPageEditorRecord {
  const value = readRecord(row);
  const business = readRecord(businessRow);
  const draft = validateHostedPageEditorDraft(value.draft_json);
  return {
    id: readString(value.id, 120) ?? "",
    customerId: customer.id,
    customerEmail: customer.email,
    businessId: readString(value.business_id, 120) ?? "",
    businessName: readString(business.business_name, 120) ?? draft.businessName,
    code: readString(value.code, 40) ?? "",
    lifecycleStatus: readLifecycleStatus(value.lifecycle_status),
    draft,
    draftVersion: Number(value.draft_version||0),
    publishedVersion: readString(value.published_version, 120),
    publishedAt: readString(value.published_at, 80),
    updatedAt: readString(value.updated_at, 80)
  };
}

function normalizeCustomer(row: unknown) {
  const value = readRecord(row);
  const id = readString(value.id, 120);
  const email = readString(value.email, 180);
  return id && email ? { id, email: normalizeEmail(email) } : null;
}

function readLifecycleStatus(value: unknown): HostedPageLifecycleStatus {
  return value === "PAST_DUE" || value === "CANCELLED_AT_PERIOD_END" || value === "EXPIRED" || value === "REACTIVATED" || value === "RETIRED_INTERNAL"
    ? value
    : "ACTIVE";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}
