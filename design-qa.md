# Workspace card and popup QA — 2026-10-23

Selected references: supplied Google review table, circled Overview location table, Google profile issue cards, heat-map controls, and Semrush performance screenshot.

Implemented shared pale headers, thin borders, compact controls, location cards, issue detail dialogs, point dialogs, and per-metric performance cards. Admin shared table styling stays operational-only.

Passed: TypeScript, production build, 24 focused tests (location selection, local issues, heat-map approval, Google profile management), diff whitespace check.

Live Norah checks: profile cards open the correct issue; AI request reveals the existing cost confirmation without generating a draft; Escape closes and restores card focus. Heat-map Point 2 opens rank 19, matching keyword and 7x7/2 km saved grid. Reports display existing Google totals and trends. Overview displays 22 reviews, 2 unanswered, 2 drafts and the latest connection state. Mobile 390x844 dialog fits without horizontal overflow. Admin dashboard and Usage remain operational-only and pricing inactive.

Source and rendered profile screenshots were reviewed together. Screenshots: C:/Sites/tap-rater-claude/artifacts/workspace-cards-20261023/.

Limitations: Semrush live tab repeatedly timed out; supplied screenshots used. Norah has one location, so multi-location isolation is covered by existing selection tests and unchanged scoped endpoints. No scans, AI generations, draft approvals, external profile changes or replies were submitted during QA. Full visual parity for every admin commerce screen was not audited in this pass.

Status: passed for changed customer surfaces and admin shared table styling; live Semrush comparison blocked by browser timeout.
