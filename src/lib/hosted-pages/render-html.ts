import { getHostedButtonMark } from "@/lib/hosted-page-editor-shared";
import type { HostedPageResolution, HostedPageAppearance } from "./snapshots";
import { hostedPageEventUrl, type HostedPageTracking } from "./tracking";

// Only the live public page passes tracking; editor previews never record activity.
export type HostedPageRenderOptions = { tracking?: HostedPageTracking };

export function renderHostedPageHtml(resolution: HostedPageResolution, options: HostedPageRenderOptions = {}) {
  if (resolution.state === "not_found") {
    return renderShell({
      title: "Tap Rater page not found",
      body: `<p class="tr-copy">This Tap Rater page is not available. Check the code or contact the business for an updated link.</p>`,
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
      body: `<p class="tr-copy">This Tap Rater page is not active right now. The permanent URL has been preserved and can be reactivated without changing the QR or NFC destination.</p>`,
      logoUrl: snapshot.logoUrl,
      theme: snapshot.appearance?.theme,
      logoAlign: snapshot.appearance?.logoAlign,
      textAlign: snapshot.appearance?.textAlign,
      statusCode: "inactive"
    });
  }

  const visibleButtons = snapshot.buttons.filter((button) => button.isVisible !== false);
  const tracking = options.tracking;
  // A 1x1 image records the page open; only browsers that load the page fetch it.
  const viewPixel = tracking ? `<img class="tr-pixel" src="${escapeAttribute(hostedPageEventUrl({ type: "view", code: snapshot.code, tracking }))}" alt="" width="1" height="1">` : "";
  // Clicks are reported with the link ping attribute, so the button still goes straight to the site.
  const ping = (button: { id: string; iconKey?: string; type: string }) => tracking ? ` ping="${escapeAttribute(hostedPageEventUrl({ type: "click", code: snapshot.code, tracking, buttonId: button.id, buttonType: button.iconKey ?? button.type }))}"` : "";
  // The business name shows above a custom title, or as the title when there is none, unless the
  // customer hid it. Then only a custom title shows.
  const showName = snapshot.showBusinessName !== false;
  const customHeading = snapshot.headline && snapshot.headline !== snapshot.businessName ? snapshot.headline : undefined;
  const heading = customHeading ?? (showName ? snapshot.businessName : undefined);

  if (visibleButtons.length === 0) {
    return renderShell({
      title: escapeHtml(snapshot.businessName),
      logoUrl: snapshot.logoUrl,
      theme: snapshot.appearance?.theme,
      accentColor: snapshot.appearance?.accentColor,
      logoAlign: snapshot.appearance?.logoAlign,
      textAlign: snapshot.appearance?.textAlign,
      body: `
        ${heading ? `<h1>${escapeHtml(heading)}</h1>` : ""}
        <p class="tr-copy">${escapeHtml(snapshot.description ?? "This Tap Rater page is being set up. The permanent URL is active and will keep working after the business publishes its links.")}</p>
        <p class="tr-footer"><a href="https://taprater.com/" target="_blank" rel="noopener">Powered by Tap Rater</a></p>
        ${viewPixel}
      `,
      statusCode: "setup"
    });
  }

  const buttonHtml = visibleButtons
    .map(
      (button) => {
        const mark = getHostedButtonMark(button.iconKey ?? button.type);
        if (mark.logo) {
          return `<a class="tr-button" href="${escapeAttribute(button.url)}" rel="noopener noreferrer nofollow" data-type="${escapeAttribute(button.type)}"${ping(button)}><span class="tr-button-mark tr-button-logo" aria-label="${escapeAttribute(mark.brand)}"><img src="${escapeAttribute(mark.logo)}" alt=""></span><span>${escapeHtml(button.label)}</span></a>`;
        }
        return `<a class="tr-button" href="${escapeAttribute(button.url)}" rel="noopener noreferrer nofollow" data-type="${escapeAttribute(button.type)}"${ping(button)}><span class="tr-button-mark" style="background:${escapeAttribute(mark.background)};border-color:${escapeAttribute(mark.border)};color:${escapeAttribute(mark.color)}" aria-label="${escapeAttribute(mark.brand)}">${hostedButtonIconSvg(mark.icon, mark.text)}</span><span>${escapeHtml(button.label)}</span></a>`;
      }
    )
    .join("");

  return renderShell({
    title: escapeHtml(snapshot.businessName),
    logoUrl: snapshot.logoUrl,
    theme: snapshot.appearance?.theme,
    accentColor: snapshot.appearance?.accentColor,
    logoAlign: snapshot.appearance?.logoAlign,
    textAlign: snapshot.appearance?.textAlign,
    body: `
      ${showName && snapshot.headline && snapshot.headline !== snapshot.businessName ? `<p class="tr-business">${escapeHtml(snapshot.businessName)}</p>` : ""}
      ${heading ? `<h1>${escapeHtml(heading)}</h1>` : ""}
      ${snapshot.description ? `<p class="tr-copy">${escapeHtml(snapshot.description)}</p>` : ""}
      <nav class="tr-buttons${visibleButtons.length > 10 ? " tr-buttons-many" : ""}" aria-label="${escapeAttribute(snapshot.businessName)} links">${buttonHtml}</nav>
      <p class="tr-footer"><a href="https://taprater.com/" target="_blank" rel="noopener">Powered by Tap Rater</a></p>
      ${viewPixel}
    `,
    statusCode: "available"
  });
}

function renderShell({
  title,
  body,
  logoUrl,
  theme,
  accentColor,
  logoAlign,
  textAlign,
  statusCode
}: {
  title: string;
  body: string;
  logoUrl?: string;
  theme?: HostedPageAppearance["theme"];
  accentColor?: string;
  logoAlign?: "left" | "center" | "right";
  textAlign?: "left" | "center" | "right";
  statusCode: string;
}) {
  const themeTokens = getThemeTokens(theme);
  const accent = accentColor && /^#[0-9a-fA-F]{6}$/.test(accentColor) ? accentColor : themeTokens.accent;
  const buttonText = getButtonTextForAccent(accent, themeTokens.buttonText);
  const logoMargin = logoAlign === "left" ? "0 auto 24px 0" : logoAlign === "right" ? "0 0 24px auto" : "0 auto 24px";
  const contentAlign = textAlign === "left" || textAlign === "right" ? textAlign : "center";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex">
  <title>${stripTags(title)}</title>
  <style>
    :root { color-scheme: ${themeTokens.colorScheme}; --accent: ${accent}; --ink: ${themeTokens.ink}; --muted: ${themeTokens.muted}; --line: ${themeTokens.line}; --soft: ${themeTokens.soft}; --card: ${themeTokens.card}; --button-bg: ${themeTokens.buttonBg}; --button-text: ${buttonText}; --shadow: ${themeTokens.shadow}; }
    * { box-sizing: border-box; }
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: var(--soft); color: var(--ink); font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    main { width: min(100%, 560px); padding: 24px; }
    .tr-card { border: 1px solid var(--line); border-radius: 8px; background: var(--card); padding: clamp(24px, 7vw, 42px); text-align: ${contentAlign}; box-shadow: var(--shadow); }
    .tr-logo { display: block; width: auto; max-width: min(220px, 70%); height: auto; max-height: 96px; object-fit: contain; border-radius: 8px; margin: ${logoMargin}; }
    .tr-business { margin: 0 0 8px; color: var(--muted); font-size: 0.95rem; font-weight: 600; }
    h1 { margin: 0; font-size: clamp(1.75rem, 8vw, 2.5rem); line-height: 1.1; letter-spacing: 0; }
    .tr-copy { margin: 18px 0 0; color: var(--muted); font-size: 1rem; line-height: 1.65; }
    .tr-buttons { display: grid; gap: 12px; margin-top: 28px; }
    .tr-button { display: flex; min-height: 52px; align-items: center; justify-content: flex-start; gap: 12px; border-radius: 10px; background: var(--button-bg); color: var(--ink); border: 1.5px solid var(--accent); padding: 12px 16px; font-weight: 600; text-align: left; text-decoration: none; overflow-wrap: anywhere; }
    .tr-button-mark { display: grid; width: 34px; height: 34px; flex: 0 0 34px; place-items: center; border-radius: 9px; background: rgba(255,255,255,0.96); color: var(--ink); font-size: 0.78rem; font-weight: 700; }
    /* More than 10 links: slightly smaller buttons so the list stays easy to scroll on a phone. */
    .tr-buttons-many { gap: 8px; margin-top: 22px; }
    .tr-buttons-many .tr-button { min-height: 44px; padding: 8px 14px; font-size: 0.95rem; }
    .tr-buttons-many .tr-button-mark { width: 28px; height: 28px; flex-basis: 28px; }
    .tr-pixel { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; }
    .tr-button-mark svg { width: 18px; height: 18px; display: block; }
    .tr-button-mark span { display: block; font-size: 0.62rem; font-weight: 700; line-height: 1; }
    .tr-button-logo { overflow: hidden; background: #ffffff; border: 0; }
    .tr-button-logo img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .tr-button:focus-visible { outline: 3px solid color-mix(in srgb, var(--accent), white 55%); outline-offset: 3px; }
    .tr-footer { margin: 28px 0 0; color: var(--muted); font-size: 0.82rem; }
    .tr-footer a { color: inherit; text-decoration: none; }
    .tr-footer a:hover, .tr-footer a:focus-visible { text-decoration: underline; }
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

function getThemeTokens(theme: HostedPageAppearance["theme"] | undefined) {
  if (theme === "warm") {
    return {
      colorScheme: "light",
      accent: "#b45309",
      ink: "#231815",
      muted: "#725f55",
      line: "#eadfd6",
      soft: "#fbf6f0",
      card: "#fffaf5",
      buttonBg: "#f7f2ec",
      buttonText: "#ffffff",
      shadow: "0 18px 50px rgba(80, 45, 17, 0.12)"
    };
  }

  if (theme === "bold" || theme === "dark") {
    return {
      colorScheme: "dark",
      accent: "#14b8a6",
      ink: "#f8fafc",
      muted: "#cbd5e1",
      line: "#334155",
      soft: "#0f172a",
      card: "#111827",
      buttonBg: "#1f2937",
      buttonText: "#061311",
      shadow: "0 18px 50px rgba(0, 0, 0, 0.28)"
    };
  }

  return {
    colorScheme: "light",
    accent: "#0f766e",
    ink: "#17211f",
    muted: "#62706c",
    line: "#dfe7e3",
    soft: "#f6f8f6",
    card: "#ffffff",
    buttonBg: "#f4f5f7",
    buttonText: "#ffffff",
    shadow: "0 18px 50px rgba(23, 33, 31, 0.08)"
  };
}

function getButtonTextForAccent(accent: string, fallback: string) {
  const normalized = accent.toLowerCase();
  if (normalized === "#e5e7eb") return "#111827";
  if (normalized === "#6b7280") return "#ffffff";
  return fallback;
}

function hostedButtonIconSvg(icon: string, fallbackText: string) {
  if (icon === "order") return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8h12l-1 12H7L6 8Zm3 0V6a3 3 0 0 1 6 0v2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  if (icon === "pay") return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm3 6.5c-.6-.9-1.7-1.5-3-1.5-1.7 0-3 1-3 2.3s1.3 1.9 3 2.2 3 .9 3 2.2-1.3 2.3-3 2.3c-1.3 0-2.4-.6-3-1.5M12 6v12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  if (icon === "gift") return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 11h16v9H4zM3 7h18v4H3zM12 7v13M12 7c-1.5-3-5-3-5-1s3 1 5 1Zm0 0c1.5-3 5-3 5-1s-3 1-5 1Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  if (icon === "google") {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.23c0-.74-.07-1.45-.19-2.14H12v4.05h5.38a4.6 4.6 0 0 1-1.99 3.02v2.51h3.23c1.89-1.74 2.98-4.3 2.98-7.44Z"/><path fill="#34A853" d="M12 22c2.7 0 4.96-.89 6.62-2.33l-3.23-2.51c-.9.6-2.04.95-3.39.95-2.61 0-4.82-1.76-5.61-4.13H3.05v2.59A9.99 9.99 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.39 13.98A6 6 0 0 1 6.07 12c0-.69.12-1.36.32-1.98V7.43H3.05A9.99 9.99 0 0 0 2 12c0 1.61.39 3.13 1.05 4.57l3.34-2.59Z"/><path fill="#EA4335" d="M12 5.89c1.47 0 2.78.5 3.81 1.49l2.87-2.87C16.95 2.9 14.69 2 12 2a9.99 9.99 0 0 0-8.95 5.43l3.34 2.59C7.18 7.65 9.39 5.89 12 5.89Z"/></svg>`;
  }

  if (icon === "instagram") {
    return `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="5" width="14" height="14" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="16.5" cy="7.5" r="1" fill="currentColor"/></svg>`;
  }

  if (icon === "website") return `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 12h18M12 3c2.4 2.5 3.6 5.5 3.6 9S14.4 18.5 12 21c-2.4-2.5-3.6-5.5-3.6-9S9.6 5.5 12 3Z" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;
  if (icon === "calendar") return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v4M17 3v4M4 9h16M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
  if (icon === "menu") return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
  if (icon === "contact") return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v12H4z" fill="none" stroke="currentColor" stroke-width="2"/><path d="m4 7 8 6 8-6" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;
  if (icon === "link") return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1M14 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
  if (icon === "youtube") return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 7.5v9l7-4.5-7-4.5Z" fill="currentColor"/></svg>`;
  if (icon === "tiktok") return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4v10.2a3.2 3.2 0 1 1-3.2-3.2M14 4c.4 2.3 1.9 3.8 4.2 4.1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;
  if (icon === "whatsapp") return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4a7.7 7.7 0 0 0-6.6 11.7L4.7 20l4.4-1.1A7.8 7.8 0 1 0 12 4Z" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9.2 8.9c.2-.5.4-.5.7-.5h.5c.2 0 .4.1.5.4l.7 1.6c.1.3 0 .5-.2.7l-.4.5c.6 1.1 1.4 1.9 2.6 2.5l.5-.6c.2-.2.4-.3.7-.2l1.6.7c.3.1.4.3.4.6v.4c0 .4-.2.7-.5.9-.4.2-.9.3-1.4.3-3.1-.2-6.9-3.8-7.1-7 0-.4.1-.9.4-1.3Z" fill="currentColor"/></svg>`;
  return `<span>${escapeHtml(fallbackText)}</span>`;
}

const htmlEscapes: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
};
