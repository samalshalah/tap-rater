export { renderHostedPageHtml } from "./render-html";
import { type HostedPageEditorButtonType } from "@/lib/hosted-page-editor-shared";
import { assertHostedPageCode, isValidHostedPageCode } from "./codes";

export type HostedPageLifecycleStatus =
  | "ACTIVE"
  | "PAST_DUE"
  | "CANCELLED_AT_PERIOD_END"
  | "EXPIRED"
  | "REACTIVATED"
  | "RETIRED_INTERNAL";

export type HostedPageButtonType = "review" | "booking" | "menu" | "order" | "website" | "social" | "payment" | "loyalty" | "custom";

export type HostedPageButton = {
  id: string;
  label: string;
  type: HostedPageButtonType;
  iconKey?: HostedPageEditorButtonType;
  url: string;
  isVisible?: boolean;
};

export type HostedPageAppearance = {
  theme?: "light" | "dark" | "warm" | "bold";
  accentColor?: string;
  logoAlign?: "left" | "center" | "right";
  textAlign?: "left" | "center" | "right";
};

export type HostedPageSnapshot = {
  schemaVersion: 1;
  code: string;
  version: string;
  publishedAt: string;
  lifecycleStatus: HostedPageLifecycleStatus;
  subscriptionPastDueSince?: string;
  subscriptionPaidThrough?: string;
  businessName: string;
  logoUrl?: string;
  headline?: string;
  description?: string;
  buttons: HostedPageButton[];
  appearance?: HostedPageAppearance;
};

export type HostedPageCurrentPointer = {
  code: string;
  currentVersion: string;
  updatedAt: string;
};

export type HostedPageAssignment = {
  code: string;
  physicalProductRef: string;
  assignedAt: string;
  assignedBy?: string;
};

export type HostedPageDisplayState = "available" | "inactive" | "not_found";

export type HostedPageResolution = {
  state: HostedPageDisplayState;
  reason?: string;
  snapshot?: HostedPageSnapshot;
};

const allowedButtonTypes: HostedPageButtonType[] = ["review", "booking", "menu", "order", "website", "social", "payment", "loyalty", "custom"];
const visibleInactiveStatuses = new Set<HostedPageLifecycleStatus>(["EXPIRED", "RETIRED_INTERNAL"]);

export function hostedPageAssignmentKey(code: string) {
  assertHostedPageCode(code);
  return `hosted-pages/${code}/assignment.json`;
}

export function hostedPageProductAssignmentKey(physicalProductRef: string) {
  return `hosted-pages/by-product/${encodeKeySegment(physicalProductRef)}.json`;
}

export function hostedPageVersionKey(code: string, version: string) {
  assertHostedPageCode(code);
  return `hosted-pages/${code}/versions/${encodeKeySegment(version)}.json`;
}

export function hostedPageCurrentKey(code: string) {
  assertHostedPageCode(code);
  return `hosted-pages/${code}/current.json`;
}

export function validateHostedPageSnapshot(input: HostedPageSnapshot): HostedPageSnapshot {
  if (!input || typeof input !== "object") {
    throw new HostedPageSnapshotError("Hosted page snapshot is required.");
  }

  if (input.schemaVersion !== 1) {
    throw new HostedPageSnapshotError("Unsupported hosted page snapshot schema version.");
  }

  if (!isValidHostedPageCode(input.code)) {
    throw new HostedPageSnapshotError("Hosted page snapshot code is invalid.");
  }

  if (!isNonEmptyString(input.version) || input.version.length > 80) {
    throw new HostedPageSnapshotError("Hosted page snapshot version is required.");
  }

  if (!isIsoDate(input.publishedAt)) {
    throw new HostedPageSnapshotError("Hosted page snapshot publishedAt must be an ISO date.");
  }

  if (!isLifecycleStatus(input.lifecycleStatus)) {
    throw new HostedPageSnapshotError("Hosted page snapshot lifecycle status is invalid.");
  }

  if (!isNonEmptyString(input.businessName) || input.businessName.length > 120) {
    throw new HostedPageSnapshotError("Hosted page snapshot business name is required.");
  }

  if (input.logoUrl && !isSafePublicUrl(input.logoUrl)) {
    throw new HostedPageSnapshotError("Hosted page logo URL must be HTTP or HTTPS.");
  }

  if (!Array.isArray(input.buttons) || input.buttons.length > 10) {
    throw new HostedPageSnapshotError("Hosted page snapshot must contain 0 to 10 buttons.");
  }

  const buttons = input.buttons.map(validateHostedPageButton);

  return {
    ...input,
    businessName: input.businessName.trim(),
    headline: trimOptional(input.headline, 140),
    description: trimOptional(input.description, 300),
    logoUrl: trimOptional(input.logoUrl, 500),
    buttons,
    appearance: normalizeAppearance(input.appearance)
  };
}

export function resolveHostedPageLifecycle(snapshot: HostedPageSnapshot, now = new Date()): HostedPageResolution {
  if (snapshot.lifecycleStatus === "ACTIVE" || snapshot.lifecycleStatus === "REACTIVATED") {
    return { state: "available", snapshot };
  }

  if (snapshot.lifecycleStatus === "PAST_DUE") {
    const graceStarted = parseDate(snapshot.subscriptionPastDueSince);
    if (graceStarted && daysBetween(graceStarted, now) <= 7) {
      return { state: "available", reason: "past_due_grace", snapshot };
    }

    return { state: "inactive", reason: "past_due_grace_expired", snapshot };
  }

  if (snapshot.lifecycleStatus === "CANCELLED_AT_PERIOD_END") {
    const paidThrough = parseDate(snapshot.subscriptionPaidThrough);
    if (paidThrough && paidThrough >= now) {
      return { state: "available", reason: "cancelled_paid_through", snapshot };
    }

    return { state: "inactive", reason: "cancelled_period_ended", snapshot };
  }

  if (visibleInactiveStatuses.has(snapshot.lifecycleStatus)) {
    return { state: "inactive", reason: snapshot.lifecycleStatus.toLowerCase(), snapshot };
  }

  return { state: "inactive", reason: "inactive", snapshot };
}

export function hostedPageResponseStatus(resolution: HostedPageResolution) {
  return resolution.state === "not_found" ? 404 : 200;
}

export class HostedPageSnapshotError extends Error {}

function validateHostedPageButton(button: HostedPageButton): HostedPageButton {
  if (!button || typeof button !== "object") {
    throw new HostedPageSnapshotError("Hosted page button is invalid.");
  }

  if (!isNonEmptyString(button.id) || button.id.length > 80) {
    throw new HostedPageSnapshotError("Hosted page button id is required.");
  }

  if (!isNonEmptyString(button.label) || button.label.length > 80) {
    throw new HostedPageSnapshotError("Hosted page button label is required.");
  }

  if (!allowedButtonTypes.includes(button.type)) {
    throw new HostedPageSnapshotError("Hosted page button type is unsupported.");
  }

  if (!isSafePublicUrl(button.url)) {
    throw new HostedPageSnapshotError("Hosted page button URL must be HTTP or HTTPS.");
  }

  return {
    id: button.id.trim(),
    label: button.label.trim(),
    type: button.type,
    iconKey: isHostedButtonIconKey(button.iconKey) ? button.iconKey : undefined,
    url: button.url.trim(),
    isVisible: button.isVisible
  };
}

function normalizeAppearance(appearance: HostedPageAppearance | undefined): HostedPageAppearance | undefined {
  if (!appearance) return undefined;
  const logoAlign: HostedPageAppearance["logoAlign"] = appearance.logoAlign === "left" || appearance.logoAlign === "right" ? appearance.logoAlign : "center";
  const textAlign: HostedPageAppearance["textAlign"] = appearance.textAlign === "left" || appearance.textAlign === "right" ? appearance.textAlign : "center";

  return {
    theme: appearance.theme,
    accentColor: appearance.accentColor && /^#[0-9a-fA-F]{6}$/.test(appearance.accentColor) ? appearance.accentColor : undefined,
    logoAlign,
    textAlign
  };
}

export function isSafePublicUrl(value: string | undefined): value is string {
  if (!value) return false;

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function isHostedButtonIconKey(value: unknown): value is HostedPageEditorButtonType {
  return (
    value === "google_review" ||
    value === "yelp" ||
    value === "facebook" ||
    value === "instagram" ||
    value === "website" ||
    value === "appointment" ||
    value === "menu" ||
    value === "contact" ||
    value === "whatsapp" ||
    value === "custom_link"
  );
}

function isLifecycleStatus(value: unknown): value is HostedPageLifecycleStatus {
  return (
    value === "ACTIVE" ||
    value === "PAST_DUE" ||
    value === "CANCELLED_AT_PERIOD_END" ||
    value === "EXPIRED" ||
    value === "REACTIVATED" ||
    value === "RETIRED_INTERNAL"
  );
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isIsoDate(value: unknown): value is string {
  return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

function trimOptional(value: string | undefined, maxLength: number) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, maxLength) : undefined;
}

function parseDate(value: string | undefined) {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function daysBetween(start: Date, end: Date) {
  return (end.getTime() - start.getTime()) / 86_400_000;
}

function encodeKeySegment(value: string) {
  return encodeURIComponent(value.trim()).replaceAll("%", "~");
}
