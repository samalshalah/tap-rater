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
  url: string;
  isVisible?: boolean;
};

export type HostedPageAppearance = {
  theme?: "light" | "dark" | "warm" | "bold";
  accentColor?: string;
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

export function renderHostedPageHtml(resolution: HostedPageResolution) {
  if (resolution.state === "not_found") {
    return renderShell({
      title: "Tap Rater page not found",
      body: `<p class="tr-copy">This Tap Rater page is not available. Check the printed code or contact the business for an updated link.</p>`,
      statusCode: "not-found"
    });
  }

  const snapshot = resolution.snapshot;
  if (!snapshot) {
    return renderHostedPageHtml({ state: "not_found" });
  }

  if (resolution.state === "inactive") {
    return renderShell({
      title: `${escapeHtml(snapshot.businessName)} is unavailable`,
      body: `<p class="tr-copy">This Tap Rater page is not active right now. The permanent URL has been preserved and can be reactivated without changing the printed QR or NFC destination.</p>`,
      logoUrl: snapshot.logoUrl,
      statusCode: "inactive"
    });
  }

  const visibleButtons = snapshot.buttons.filter((button) => button.isVisible !== false);
  if (visibleButtons.length === 0) {
    return renderShell({
      title: escapeHtml(snapshot.businessName),
      logoUrl: snapshot.logoUrl,
      accentColor: snapshot.appearance?.accentColor,
      body: `
        <p class="tr-kicker">Tap Rater</p>
        <h1>${escapeHtml(snapshot.headline ?? snapshot.businessName)}</h1>
        <p class="tr-copy">${escapeHtml(snapshot.description ?? "This Tap Rater page is being set up. The permanent URL is active and will keep working after the business publishes its links.")}</p>
        <p class="tr-footer">Powered by Tap Rater</p>
      `,
      statusCode: "setup"
    });
  }

  const buttonHtml = visibleButtons
    .map(
      (button) =>
        `<a class="tr-button" href="${escapeAttribute(button.url)}" rel="noopener noreferrer nofollow" data-type="${escapeAttribute(button.type)}">${escapeHtml(button.label)}</a>`
    )
    .join("");

  return renderShell({
    title: escapeHtml(snapshot.businessName),
    logoUrl: snapshot.logoUrl,
    accentColor: snapshot.appearance?.accentColor,
    body: `
      <p class="tr-kicker">Tap Rater</p>
      <h1>${escapeHtml(snapshot.headline ?? snapshot.businessName)}</h1>
      ${snapshot.description ? `<p class="tr-copy">${escapeHtml(snapshot.description)}</p>` : ""}
      <nav class="tr-buttons" aria-label="${escapeAttribute(snapshot.businessName)} links">${buttonHtml}</nav>
      <p class="tr-footer">Powered by Tap Rater</p>
    `,
    statusCode: "available"
  });
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
    url: button.url.trim(),
    isVisible: button.isVisible
  };
}

function normalizeAppearance(appearance: HostedPageAppearance | undefined) {
  if (!appearance) return undefined;

  return {
    theme: appearance.theme,
    accentColor: appearance.accentColor && /^#[0-9a-fA-F]{6}$/.test(appearance.accentColor) ? appearance.accentColor : undefined
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

function renderShell({
  title,
  body,
  logoUrl,
  accentColor,
  statusCode
}: {
  title: string;
  body: string;
  logoUrl?: string;
  accentColor?: string;
  statusCode: string;
}) {
  const accent = accentColor && /^#[0-9a-fA-F]{6}$/.test(accentColor) ? accentColor : "#0f766e";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>${stripTags(title)}</title>
  <style>
    :root { color-scheme: light; --accent: ${accent}; --ink: #17211f; --muted: #62706c; --line: #dfe7e3; --soft: #f6f8f6; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: var(--soft); color: var(--ink); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    main { width: min(100%, 560px); padding: 24px; }
    .tr-card { border: 1px solid var(--line); border-radius: 8px; background: #fff; padding: clamp(24px, 7vw, 42px); box-shadow: 0 18px 50px rgba(23, 33, 31, 0.08); }
    .tr-logo { display: block; width: 72px; height: 72px; object-fit: contain; border-radius: 8px; margin-bottom: 24px; }
    .tr-kicker { margin: 0 0 10px; color: var(--accent); font-size: 0.78rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0; }
    h1 { margin: 0; font-size: clamp(2rem, 10vw, 3rem); line-height: 1; letter-spacing: 0; }
    .tr-copy { margin: 18px 0 0; color: var(--muted); font-size: 1rem; line-height: 1.65; }
    .tr-buttons { display: grid; gap: 12px; margin-top: 28px; }
    .tr-button { display: flex; min-height: 52px; align-items: center; justify-content: center; border-radius: 8px; background: var(--accent); color: #fff; padding: 14px 18px; font-weight: 800; text-decoration: none; overflow-wrap: anywhere; }
    .tr-button:focus-visible { outline: 3px solid color-mix(in srgb, var(--accent), white 55%); outline-offset: 3px; }
    .tr-footer { margin: 28px 0 0; color: var(--muted); font-size: 0.82rem; }
  </style>
</head>
<body>
  <main data-status="${escapeAttribute(statusCode)}">
    <section class="tr-card">
      ${logoUrl ? `<img class="tr-logo" src="${escapeAttribute(logoUrl)}" alt="">` : ""}
      ${body}
    </section>
  </main>
</body>
</html>`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => htmlEscapes[character] ?? character);
}

function escapeAttribute(value: string) {
  return escapeHtml(value);
}

function stripTags(value: string) {
  return value.replace(/<[^>]*>/g, "");
}

const htmlEscapes: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
};

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
