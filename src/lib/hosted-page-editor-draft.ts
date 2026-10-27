import { hostedPageButtonLimit, supportedHostedPageButtons, type HostedPageEditorAppearance, type HostedPageEditorButton, type HostedPageEditorButtonType, type HostedPageEditorDraft, type HostedPageEditorRecord } from "@/lib/hosted-page-editor-shared";
import { isSafePublicUrl, renderHostedPageHtml, resolveHostedPageLifecycle, validateHostedPageSnapshot, type HostedPageSnapshot } from "@/lib/hosted-pages/snapshots";

const supportedButtonTypes = new Set(supportedHostedPageButtons.map((button) => button.type));

const supportedThemes = new Set(["light", "warm", "bold"]);

const supportedAccentColors = new Set(["#0f766e", "#1d4ed8", "#7c3aed", "#be123c", "#e5e7eb", "#6b7280"]);

const supportedAlignments = new Set(["left", "center", "right"]);

export class HostedPageEditorError extends Error {
  constructor(
    message: string,
    public readonly status = 400
  ) {
    super(message);
  }
}

export function buildSnapshotFromDraft(page: HostedPageEditorRecord, now = new Date(), options: { requireButtons?: boolean; publicBaseUrl?: string } = {}): HostedPageSnapshot {
  const draft = validateHostedPageEditorDraft(page.draft);
  const buttons = draft.buttons
    .filter((button) => button.label.trim() && button.url.trim())
    .sort((a, b) => a.position - b.position)
    .map((button) => {
      const catalog = supportedHostedPageButtons.find((item) => item.type === button.type);
      if (!catalog) throw new HostedPageEditorError("Unsupported button type.", 400);
      return {
        id: button.id,
        label: button.label || catalog.label,
        type: catalog.snapshotType,
        iconKey: button.type,
        url: button.url,
        isVisible: true
      };
    });

  if (options.requireButtons !== false && buttons.length === 0) {
    throw new HostedPageEditorError("Add at least one valid link before publishing.", 400);
  }

  return validateHostedPageSnapshot({
    schemaVersion: 1,
    code: page.code,
    version: `v-${now.getTime()}-${crypto.randomUUID().slice(0, 8)}`,
    publishedAt: now.toISOString(),
    lifecycleStatus: page.lifecycleStatus,
    businessName: draft.businessName,
    logoUrl: makePublicUrl(draft.logoUrl, options.publicBaseUrl),
    headline: draft.headline || draft.businessName,
    description: draft.description,
    buttons,
    appearance: draft.appearance
  });
}

export function renderHostedPageDraftPreview(page: HostedPageEditorRecord, options: { publicBaseUrl?: string } = {}) {
  const snapshot = buildSnapshotFromDraft(page, new Date(), { requireButtons: false, publicBaseUrl: options.publicBaseUrl });
  return renderHostedPageHtml(resolveHostedPageLifecycle(snapshot));
}

export function validateHostedPageEditorDraft(input: unknown): HostedPageEditorDraft {
  const value = readRecord(input);
  const businessName = readString(value.businessName, 120);
  if (!businessName || businessName.length < 2) throw new HostedPageEditorError("Business name is required.", 400);

  const logoUrl = readOptionalUrl(value.logoUrl, "Logo URL");
  const buttonsRaw = Array.isArray(value.buttons) ? value.buttons : [];
  if (buttonsRaw.length > hostedPageButtonLimit) throw new HostedPageEditorError(`Use ${hostedPageButtonLimit} or fewer buttons.`, 400);

  const buttons = buttonsRaw.map(normalizeButton).sort((a, b) => a.position - b.position);
  const appearanceRecord = readRecord(value.appearance);
  const themeValue = appearanceRecord.theme ?? "light";
  const accentValue = appearanceRecord.accentColor ?? "#0f766e";
  const logoAlignValue = appearanceRecord.logoAlign ?? "center";
  const textAlignValue = appearanceRecord.textAlign ?? "center";
  if (!supportedThemes.has(String(themeValue))) throw new HostedPageEditorError("Unsupported page style.", 400);
  if (!supportedAccentColors.has(String(accentValue))) throw new HostedPageEditorError("Unsupported accent color.", 400);
  if (!supportedAlignments.has(String(logoAlignValue))) throw new HostedPageEditorError("Unsupported logo alignment.", 400);
  if (!supportedAlignments.has(String(textAlignValue))) throw new HostedPageEditorError("Unsupported text alignment.", 400);
  const theme = themeValue as HostedPageEditorAppearance["theme"];
  const accentColor = accentValue as HostedPageEditorAppearance["accentColor"];
  const logoAlign = logoAlignValue as NonNullable<HostedPageEditorAppearance["logoAlign"]>;
  const textAlign = textAlignValue as NonNullable<HostedPageEditorAppearance["textAlign"]>;

  return {
    businessName,
    logoUrl,
    headline: readString(value.headline, 140),
    description: readString(value.description, 300),
    appearance: { theme, accentColor, logoAlign, textAlign },
    buttons
  };
}

function normalizeButton(input: unknown, index: number): HostedPageEditorButton {
  const value = readRecord(input);
  const type = String(value.type ?? "");
  if (!supportedButtonTypes.has(type as HostedPageEditorButtonType)) throw new HostedPageEditorError("Unsupported button type.", 400);
  const catalog = supportedHostedPageButtons.find((button) => button.type === type)!;
  const label = readString(value.label, 80) ?? catalog.label;
  const url = readOptionalUrl(value.url, "Destination URL") ?? "";
  return {
    id: readString(value.id, 80) ?? `${type}-${index}`,
    type: type as HostedPageEditorButtonType,
    label,
    url,
    enabled: true,
    position: readInteger(value.position) ?? index
  };
}

function readOptionalUrl(value: unknown, label: string) {
  const text = readString(value, 600);
  if (!text) return undefined;
  if (!isHttpUrl(text) && !text.startsWith("/api/media/product/")) throw new HostedPageEditorError(`${label} must start with http or https.`, 400);
  return text;
}

function makePublicUrl(value: string | undefined, publicBaseUrl?: string) {
  if (!value) return undefined;
  if (isHttpUrl(value)) return value;
  const siteUrl = publicBaseUrl || process.env.NEXT_PUBLIC_SITE_URL || "https://taprater.com";
  return `${siteUrl.replace(/\/+$/, "")}${value.startsWith("/") ? "" : "/"}${value}`;
}

function isHttpUrl(value: string) {
  return isSafePublicUrl(value);
}

export function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export function readString(value: unknown, maxLength: number) {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, maxLength) : undefined;
}

function readInteger(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) ? value : undefined;
}
