# Workspace card and popup QA — 2026-10-23

Selected references: supplied Google review table, circled Overview location table, Google profile issue cards, heat-map controls, and Semrush performance screenshot.

Implemented shared pale headers, thin borders, compact controls, location cards, issue detail dialogs, point dialogs, and per-metric performance cards. Admin shared table styling stays operational-only.

Passed: TypeScript, production build, 24 focused tests (location selection, local issues, heat-map approval, Google profile management), diff whitespace check.

Live Norah checks: profile cards open the correct issue; AI request reveals the existing cost confirmation without generating a draft; Escape closes and restores card focus. Heat-map Point 2 opens rank 19, matching keyword and 7x7/2 km saved grid. Reports display existing Google totals and trends. Overview displays 22 reviews, 2 unanswered, 2 drafts and the latest connection state. Mobile 390x844 dialog fits without horizontal overflow. Admin dashboard and Usage remain operational-only and pricing inactive.

Source and rendered profile screenshots were reviewed together. Screenshots: C:/Sites/tap-rater-claude/artifacts/workspace-cards-20261023/.

Limitations: Semrush live tab repeatedly timed out; supplied screenshots used. Norah has one location, so multi-location isolation is covered by existing selection tests and unchanged scoped endpoints. No scans, AI generations, draft approvals, external profile changes or replies were submitted during QA. Full visual parity for every admin commerce screen was not audited in this pass.

Status: passed for changed customer surfaces and admin shared table styling; live Semrush comparison blocked by browser timeout.


## Competitor sidebar — 2026-10-23

Reference: codex-clipboard-89d29e1e-61ba-477c-8c02-e4a855955a0a.png, compared alongside the rendered competitor-map.png.

Replaced point sidebar with pinned own business, competitor names, saved ratings/review counts, average ranks and sorting. Business selection changes map markers and metrics; details dialog shows saved business data and full ranking grid. Keyword, scan and location context constrain selection; switching context resets to own business. Missing competitor captures stay unavailable. No new provider submission is added; optional existing-task recovery remains free.

Passed TypeScript, production build and 18 focused tests. Live Norah verification: Ekimedo Atelier average 2.00, found 1/49; map and popup agree. Switching to boutique near me returns to Norah (average 1.3), no stale competitor dialog. Escape restores focus. Mobile 390x844 dialog has no horizontal overflow. No scans were approved or submitted, and no recovery was needed because saved competitors were already present. Reused existing map tiles and brand assets; no new raster assets required.

Artifacts: C:/Sites/tap-rater-claude/artifacts/competitor-sidebar-20261023/. Production version: 30071c8e-d76f-4c6b-a53a-6446124a63e6. Status: passed for requested sidebar and details interaction.
