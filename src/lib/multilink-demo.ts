import { getHostedButtonMark, supportedHostedPageButtons } from "@/lib/hosted-page-editor-shared";
import { recommendedMultiLinks, type MultiLinkIndustryId } from "@/lib/multilink-industries";
import { renderHostedPageHtml } from "@/lib/hosted-pages/render-html";
import type { HostedPageAppearance, HostedPageSnapshot } from "@/lib/hosted-pages/snapshots";

/**
 * Sample Multi-Link pages for the public demo. They use the same page renderer and the same
 * recommended links as a real page, for made-up businesses, with every link turned off.
 */
export type MultiLinkDemo = {
  id: MultiLinkIndustryId;
  tab: string;
  businessName: string;
  initials: string;
  headline: string;
  description: string;
  theme: NonNullable<HostedPageAppearance["theme"]>;
  accent: string;
};

export const multiLinkDemos: MultiLinkDemo[] = [
  { id: "restaurant-food", tab: "Restaurant", businessName: "Harbor Street Café", initials: "HS", headline: "Thanks for dining with us!", description: "See the menu, order again or book your next table.", theme: "warm", accent: "#b4532a" },
  { id: "beauty-salon-wellness", tab: "Spa & salon", businessName: "Willow Day Spa", initials: "W", headline: "Thanks for visiting", description: "Book your next visit, leave a tip or send a gift card.", theme: "light", accent: "#5b7f6b" },
  { id: "automotive", tab: "Car dealership", businessName: "Bayside Motors", initials: "BM", headline: "Thanks for choosing us! How did we do?", description: "Your review helps other drivers find us.", theme: "light", accent: "#1f4e9c" },
  { id: "healthcare-dental", tab: "Dental & medical", businessName: "Maple Family Dental", initials: "MD", headline: "Welcome! Start here.", description: "Fill in your forms, book a visit or pay a bill.", theme: "light", accent: "#0f7b8a" },
  { id: "hotel-travel", tab: "Hotel", businessName: "The Shoreline Inn", initials: "SI", headline: "Welcome to your stay", description: "Everything you need during your visit.", theme: "dark", accent: "#c9a45c" },
  { id: "home-services", tab: "Home services", businessName: "Summit Plumbing & Heating", initials: "SP", headline: "Thanks for having us out!", description: "A quick review helps your neighbors find us.", theme: "bold", accent: "#e0662c" }
];

export const defaultMultiLinkDemo = multiLinkDemos[0];

export function findMultiLinkDemo(id: string | null | undefined) {
  return multiLinkDemos.find((demo) => demo.id === id) ?? defaultMultiLinkDemo;
}

/** A round monogram used as the sample logo, so no real brand is shown. */
function monogramLogo(demo: MultiLinkDemo) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><circle cx="80" cy="80" r="78" fill="${demo.accent}"/><text x="80" y="80" dy=".35em" text-anchor="middle" font-family="Georgia, serif" font-size="${demo.initials.length > 1 ? 58 : 72}" fill="#fff">${demo.initials}</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

export function multiLinkDemoSnapshot(demo: MultiLinkDemo): HostedPageSnapshot {
  const buttons = recommendedMultiLinks(demo.id, "connect-with-us-stand").map((link, index) => {
    const catalog = supportedHostedPageButtons.find((item) => item.type === link.type);
    // Branded links always show the brand name, as on a real page.
    const branded = Boolean(getHostedButtonMark(link.type).logo);
    return {
      id: `demo-${index}`,
      label: branded ? catalog?.label ?? link.type : link.label ?? catalog?.label ?? link.type,
      type: catalog?.snapshotType ?? "custom",
      iconKey: link.type,
      url: "#",
      isVisible: true
    };
  });
  return {
    schemaVersion: 1,
    code: "DEMO",
    version: "demo",
    publishedAt: "2026-11-27T00:00:00.000Z",
    lifecycleStatus: "ACTIVE",
    businessName: demo.businessName,
    logoUrl: monogramLogo(demo),
    headline: demo.headline,
    description: demo.description,
    buttons,
    appearance: { theme: demo.theme, accentColor: demo.accent, logoAlign: "center", textAlign: "center" }
  } as HostedPageSnapshot;
}

/** The sample page as a customer would see it. Links go nowhere and a note says it is a sample. */
export function renderMultiLinkDemoHtml(demo: MultiLinkDemo) {
  const html = renderHostedPageHtml({ state: "available", snapshot: multiLinkDemoSnapshot(demo) });
  const note = `<p style="margin:18px auto 0;max-width:320px;padding:8px 12px;border-radius:999px;background:rgba(127,127,127,.14);font:500 12px/1.4 system-ui,sans-serif;text-align:center">Sample page · links are turned off</p>`;
  return html.replace("</body>", `${note}</body>`);
}
