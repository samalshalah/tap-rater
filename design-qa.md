# Client theme fidelity QA — October 22, 2026

Source visual truth: C:/Users/hussa/AppData/Local/Temp/codex-clipboard-729c1cc2-e027-48ce-8cde-f8fef0e27035.png (1487 x 1058).
Evidence folder: C:/Sites/tap-rater-claude/artifacts/dashboard-redesign-20261022.
Implementation: authenticated Norah Boutique customer account, production.
Browser CSS viewport: 1920 x 945, devicePixelRatio 1. Captured screenshot: 1905 x 938 (browser capture excludes edges). Full-view comparison preserves aspect ratios and labels viewport differences; focused popup comparison uses approximately equal 650px regions rather than distorting either image.

## Comparison history
1. Original compact implementation did not match the selected theme. Replaced the full-width location bar, filter dropdown, numeric ratings and old modal with top-right location controls, counted tabs, initials, gold stars, dates and the referenced modal structure.
2. Initial browser comparison found P2 legacy title sizing, sidebar overflow and an inherited full-width Save button. Fixed CSS specificity, sidebar padding and popup button widths. Final observed title is 40px Arial; sidebar has no horizontal overflow; popup is 650px wide and Save is 184px.
3. Focused comparison found P2 section heading weight drift. Corrected modal section headings and action font weights.

## Fidelity surfaces
- Typography: Arial sans-serif; navy 40px page titles, 24px popup title, 16px popup section labels, 14px list text.
- Spacing: 210px sidebar, top-right selector, compact table, 650px native dialog, outlined Save and navy Approve. Popup height varies with actual review text and the retained AI tools disclosure.
- Colors: pale blue surfaces, navy text, teal selection, gold stars, blue draft and green replied/approved badges, amber draft-only banner.
- Assets: authentic existing Tap Rater logo retained (gray wordmark differs from mock navy wordmark); official Google icon downloaded from gstatic; Lucide icons. Real initials and real ratings replace illustrative people and incorrect sample stars.
- Content: real 22 reviews, 2 awaiting replies, 2 drafts, 0 approved drafts and 20 existing Google replies. Additional Replied filter is intentional; existing replies are not falsely counted as approvals. Existing 4,000-character limit retained. Real account names, addresses and dates replace sample content.

## Verification
TypeScript, production Cloudflare build and 67 targeted tests passed. Draft tab returns two rows; Approved tab displays an empty-state message; Escape closes the popup. Popup has Save draft and Approve draft only, no Publish button. Location-scoped profile still shows publishing disabled. No content saved, approved, generated or published during this pass. No migration or pricing changes. Browser error log empty.

Evidence: theme-reviews-final.png, theme-popup-final.png, theme-comparison.png, theme-popup-comparison.png. Review the focused comparison for text/control detail; full-view evidence establishes layout and palette.

Residual test gap: no separate mobile device verification; responsive rules retain scrolling table and stacked location controls. Existing authentic logo and real-data/AI-tool differences are intentional, not sample-data duplication.

Final deployment: c37a3c14-c805-4354-96b4-f521c87cc7f2. Final browser check confirms 16px/600 section headings, 184px Save button and no publishing action. Post-fix evidence: theme-popup-final.png and regenerated theme-popup-comparison.png. No actionable P0/P1/P2 findings remain in the verified desktop flow.

Final result: passed.


## Marketing pages and package access — October 22, 2026

Reference: selected light customer dashboard image, `codex-clipboard-729c1cc2-e027-48ce-8cde-f8fef0e27035.png`.

Applied the same pale sidebar, navy headings, teal navigation, compact borders, tables and controls to Heat Map, Google Profile, Directory Listings and Reports. Browser review found oversized inherited headings and a large schedule banner; corrected heading specificity and collapsed scheduling information. Final heat-map heading computed at 20px and schedule is closed by default. Cost review remains visible before scan approval.

Production browser verification used the authenticated Norah Boutique account. All four pages loaded the correct location; the location persisted across page navigation. Google Profile retained its existing draft, directory corrections remained drafts, and performance displayed actual metrics. No content was edited, approved or published; no scan was requested. Admin Usage displayed only account name, package status and request date in the added access panel. Package page explicitly states pricing is inactive and request does not charge or activate a subscription.

Evidence: `C:/Sites/tap-rater-claude/artifacts/dashboard-redesign-20261022/marketing-heatmap-final.png`, `marketing-profile.png`, `marketing-listings.png`, `marketing-reports.png`, `marketing-package-cta.png`. The profile/reports captures preceded the final heading-size adjustment; the final shared CSS was verified on Heat Map.

Validation: 96 focused unit tests passed; TypeScript and Cloudflare build passed. Access tests cover every marketing read/write route, no entitlement, expired grants, database failure, authentication, allowed active/testing accounts, and idempotent requests without granting access. Existing location-isolation and draft safety tests passed. Migration exercised first on the temporary Neon validation branch, then applied to the production app branch; Norah is the only seeded testing grant. Queued scan claims now also require package access.

Limitations: no stand-only customer browser session or mobile viewport was available for visual QA; stand-only API behavior is covered by tests. Paid purchase activation is intentionally not connected while pricing remains inactive. Use trusted administrative grants until a verified billing lifecycle is enabled.

Deployment: Cloudflare `46650da8-79fa-4386-a8b4-a79d15e1e514`.


## Compact rank tracker — October 22, 2026

Visual targets: user-supplied Semrush Heatmap, Competitors and Keywords screenshots (`293b82a4`, `8da987a6`, `5f68eb2d`). Applied their compact toolbar, slim metric strip, narrow side panel and keyword summary-card layout within Tap Rater's established theme. The side panel shows real scan points; competitor details and Share of Voice are explicitly unavailable rather than simulated.

Keyword dropdown, + and selected-keyword editor replace the sidebar keyword cards. Scan history is in the toolbar. Schedule, ranking methodology, grid explanations and metric definitions are available via hover/focus/tap information icons. Costs and explicit scan approval remain visible. Unsaved edits prevent switching tabs. The map uses measured viewport dimensions for projection, tiles, SVG and point targets, preserving geographic alignment without stretching. Responsive CSS stacks the point list below the map on small screens.

Production browser checks: switched to boutique near me (25 points), opened its populated editor, opened blank Add form, cancelled both without saving; verified information icon content and competitor unavailable state; keyword summary click opens the matching map. Real summaries show average found rank 7.29 / 1.32 / 8.86 for Norah's three keywords. No scan was purchased, no profile or reply was changed. TypeScript/build and 24 heatmap/location tests passed, including landscape tile/point alignment. Desktop visual QA completed; mobile layout not directly browser-tested.

Evidence: `C:/Sites/tap-rater-claude/artifacts/dashboard-redesign-20261022/heatmap-reference-final.png` and `heatmap-keywords-final.png`. Deployment `623022fe-f44d-4aca-82df-f12def0450ba`.


## Directory listing reference layout — October 22, 2026

Grounding: seven user-supplied Semrush listing screenshots (`8b639b4a`, `b88dd087`, `22cae336`, `1ac45bb9`, `e5b29519`, `6c8d19cd`, `3152bf17`). Implemented the compact business-profile card and completeness bar, segmented directory filters, status summary, four-column directory table, inline observed name/address/phone, issue links and row actions. Details, correction evidence, listing checks and business profile editing now use accessible native modals. Corrections has its own tab; Duplicates explicitly reports detection unavailable. Generic directory icons preserve identity labels without inventing provider logos.

Ground-truth differences from the reference: actual manual check statuses (Listed, Needs update, Missing, Not checked, Unavailable) replace unsupported Connected/Processing states. No directory distribution provider, Facebook Connect flow, opt-out or duplicate scan is claimed. The existing 11 Norah records are used; screenshot directory counts and business information were not copied into customer data. Multiple locations remain separated by the existing location selector and scoped record IDs. Completeness measures seven saved profile fields, not publication coverage.

Production QA: Norah loaded 11 directory records, 10 checked, 3 Listed, 7 Needs update and 1 Not checked. Listed filter returned exactly 3 rows; searching Apple returned 1 Apple Maps row. Details displayed the expected observed/current comparison and correction draft. Profile editor displayed Norah's saved fields. Corrections tab showed saved draft notes; Duplicates displayed the honest unavailable state. All modals were closed without saving or approving anything. No external writes, pricing activation or new scan charges. TypeScript, Cloudflare build and 34 focused directory/authorization/modal tests passed. Desktop verified; mobile CSS included but not directly browser-tested.

Evidence: `C:/Sites/tap-rater-claude/artifacts/dashboard-redesign-20261022/listing-reference-final.png` and `listing-details-popup.png`.


## Directory catalog expansion — October 23, 2026

Added all 73 reference directories with stable IDs, alias matching, reference relationships and a read-only provider adapter contract. No external adapter is installed. Existing checks remain intact. Production Norah verification: 75 rows (73 catalog entries plus Official website and Union Station directory), 10 checked, 3 listed, 7 needing updates. Waze Details shows catalog ID and pending provider/coverage status. Search and modal verified. Replies/profile changes remain drafts; pricing unchanged. TypeScript, 41 targeted tests and Cloudflare build passed. Deployment: 1826b984-3de4-4b37-9dba-f4f6cf7dd79e. Evidence: artifacts/dashboard-redesign-20261022/directory-api-ready.png.


## Heat map matching and quote verification — October 23, 2026

Matching now requires track ID, keyword, size, spacing, language and anchor Place ID/coordinates. Location-keyed workspace resets transient selection and quotes. History retains eight runs per keyword rather than eight for the whole location; history shows timestamps and grid dimensions. Historical mismatches are explicit. Cost estimates use the server-configured point rate; editor and approval show point count/area/cost; expired quotes disable approval.

Validation: TypeScript and 61 targeted tests passed; Cloudflare build and deployment da583ecb-db77-476d-a2e2-e28c1e8529e3 succeeded. Norah live keyword averages: women clothing 7.29 (49 points), boutique near me 1.32 (25), clothing store 8.86 (25). Temporarily changed clothing store to 7x7 at 1 km: New scan required, 0/49, quote $0.0294 for 6x6 km. Historical 5x5 scan showed explicit different-settings label. Canceled quote and restored 5x5 at 0.5 km; original result returned. Database confirmed four scan runs unchanged and zero approvals in the test window. No paid scan, publishing or pricing activation. Live test uses Norah only; cross-location protections covered by unit tests, not a second live customer. Evidence: artifacts/dashboard-redesign-20261022/heatmap-cost-approval.png. Competitor data remains unavailable in existing scans; not part of this matching/cost change.
