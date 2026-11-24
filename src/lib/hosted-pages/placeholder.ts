import { assignPermanentHostedPageCode, HostedPageRepositoryError, publishHostedPageSnapshot, readCurrentHostedPageSnapshot, readHostedPageAssignment, type HostedPageTextStorage } from "./repository";
import { validateHostedPageSnapshot, type HostedPageLifecycleStatus } from "./snapshots";

export type HostedPagePlaceholderInput = {
  code: string;
  /** Stable reference for the permanent code assignment, e.g. the editor page id. */
  physicalProductRef: string;
  assignedBy: string;
  businessName: string;
  headline?: string;
  logoUrl?: string;
  lifecycleStatus?: HostedPageLifecycleStatus;
  now?: Date;
};

/**
 * Makes a page's permanent link live straight away with a "being set up" page, so a QR
 * code printed before the business publishes never lands on "page not found".
 * Never replaces a page that is already live.
 */
export async function ensureHostedPagePlaceholder(storage: HostedPageTextStorage, input: HostedPagePlaceholderInput): Promise<"already_live" | "published"> {
  if (await readCurrentHostedPageSnapshot(storage, input.code)) return "already_live";

  try {
    await assignPermanentHostedPageCode(storage, { code: input.code, physicalProductRef: input.physicalProductRef, assignedBy: input.assignedBy, now: input.now });
  } catch (error) {
    // The code may already be assigned under another reference (e.g. the original order line).
    if (!(error instanceof HostedPageRepositoryError) || !(await readHostedPageAssignment(storage, input.code))) throw error;
  }

  const now = input.now ?? new Date();
  await publishHostedPageSnapshot(storage, validateHostedPageSnapshot({
    schemaVersion: 1,
    code: input.code,
    version: `setup-${now.getTime()}-${crypto.randomUUID().slice(0, 8)}`,
    publishedAt: now.toISOString(),
    lifecycleStatus: input.lifecycleStatus ?? "ACTIVE",
    businessName: input.businessName,
    logoUrl: input.logoUrl,
    headline: input.headline || input.businessName,
    buttons: [],
    appearance: { theme: "light", accentColor: "#6b7280" }
  }));
  return "published";
}
