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


## Competitors report and share of voice — 2026-10-23

Added compact top-business share-of-voice chart with Other bucket, selected-business ranking preview, searchable/sortable paginated comparison table, mini heat maps, rating, review count, average found rank, share of voice, captured-point coverage, and detail dialogs. Own business is pinned first in table. Query filters do not change the visibility denominator. Keyword and scan labels remain explicit; component remount keeps selection/filter/page separate for each keyword/scan, and parent scope isolates locations.

Method: reciprocal organic rank weights (1/rank), normalized across all captured businesses. Labelled Tap Rater estimate, not Semrush equivalence, traffic, or market share. Documentation consulted: https://www.semrush.com/kb/1399-map-rank-tracker and https://www.semrush.com/kb/1440-competitors-report-in-map-rank-tracker. Historical changes omitted rather than fabricating comparable prior data.

Passed production build/TypeScript and 20 focused tests, including new share normalization, duplicate handling, missing captures, zero denominator, absent target, keyword isolation, and free existing-task retrieval. Live Norah: women's clothing store has 213 businesses; Norah 5.91%, found 35/49, average found rank 7.29. Filtering Norah preserves 5.91%. Crystal Boutique popup matches 3.57%, 12/49. Switching to boutique near me resets comparison to Norah, 104 businesses, 23.72%, 25/25. Pagination moves 1–20 to 21–40. Mobile 390x844 has no page overflow; table scroll stays inside panel. No scan requests, retrieval requests, AI actions or publishing actions were submitted.

Visual QA: reviewed rendered chart, table and mobile against conversation's Semrush reference. Original older reference file has expired from Temp; its conversation image remains available. Ranking-grid preview uses actual captured results; no invented competitor geographic coordinates. Screenshots at C:/Sites/tap-rater-claude/artifacts/competitor-comparison-20261023/. Production version 25b8ac40-9c8b-4bc2-9eb4-ef4d9bcc7e25. Status: passed.


## Keywords summary — 2026-10-23

Implemented compact per-keyword cards with average found rank, reciprocal-rank share-of-voice estimate consistent with Competitors, Top 3 / 4–10 / 11–20 / not-found bands, distribution strip, completion count, scan date and state. Keyword opens its heat map; Compare competitors opens that keyword's comparison. Uses latest matching saved scan per track/area/language/anchor; no mutation or scan submission on view/navigation. Missing scans/captures produce unavailable metrics rather than invented zeros.

Passed TypeScript, production build, 24 focused tests across keyword summary, scan matching, competitor methodology and location selection. Live Norah cards: women's clothing store 7.29 / 5.91% / 49 points; boutique near me 1.32 / 23.72% / 25 points; clothing store 8.86 / 5.10% / 25 points. Verified links land on matching keyword and values agree. Desktop screenshot reviewed against conversation's Semrush keyword reference; mobile 390x844 wraps six metrics into two rows and has no page overflow. No paid scans or provider recovery requests were submitted. Replies, profile drafts and pricing unchanged.

Artifacts: C:/Sites/tap-rater-claude/artifacts/keyword-summary-20261023/. Production version 1fdaf6da-41f0-432f-a21c-4a5070da2996. Status: passed.


## Compact comparison controls — 2026-10-23

Applied annotated screenshot: removed scan-cost banner and settings/pause row from Competitors only. Moved schedule and refresh controls into tab row; active schedule details are behind info icon while capped/error statuses remain visible. Grid metadata is in scan-history help. Moved methodology and captured-point metadata to info icon beside Share of voice. Shared accessible tooltip component extracted without changing provider calls or approval paths.

Passed TypeScript/build, 9 existing approval/matching tests, desktop and 390px mobile inspection. No horizontal page overflow. Live Competitors has zero scan banners and one methodology icon; help displays 49/49 captured points and the existing formula. Heatmap still shows Review new scan. No scans, billing, profile or reply mutations. Screenshot: C:/Sites/tap-rater-claude/artifacts/compact-comparison-20261023/desktop.png. Version 6942c126-6fd7-406d-8387-240e63a73972. Status: passed.

## Business profile editor — October 23, 2026

Reference: six supplied Semrush business-info screenshots (About, Contact, Placement, Hours, More, completeness). Real Norah photos are used; no sample business data or generated assets.

Implemented smaller 24px desktop / 22px mobile customer page headings with selected business name underneath. Expanded location-bound Google import into structured address, categories, phone details, service areas, additional hours, attributes, payments, social links and paginated business media. Added compact five-tab profile editor, logo/cover/gallery, completeness breakdown, sticky draft-save action and directory link preserving the selected location.

Verification:
- TypeScript and production build pass; 34 focused import/profile/review-safety tests pass.
- Norah import returned 146 media items, logo, cover, five categories, social links and payment attributes. Optional fields remain blank when not returned. Existing description draft and Sunday noon–6 pm hours preserved.
- Saved the enriched draft without changing existing proposed business facts, then reloaded and verified persistence.
- Directory Listings opens the same profile with Norah's location ID.
- Desktop screenshot inspected against the supplied reference: compact tabs/form left, real gallery right, small header and location context visible.
- Mobile 390px screenshot inspected: single-column fields/gallery, horizontal navigation, no document overflow. Sticky footer remains available while scrolling.
- No browser console errors observed.
- Replies and profile changes remain drafts. No paid scans, external publication or pricing activation performed.

Artifacts: `C:/Sites/tap-rater-claude/artifacts/business-profile-20261023/desktop.png`, `mobile.png`.
Production version: `33ac2a36-0585-4848-bf5b-2877f22de76d`.

P3 follow-up: hours use editable text for flexible split/overnight periods; a dedicated time-picker grid can be added later. Provider category mapping, asset rights and explicit distribution approval remain part of the deferred directory integration.

final result: passed

## Daily and special hours — October 23, 2026

Reference: the supplied Semrush Hours editor screenshot. Replaced regular/special free-text editors with Monday–Sunday status and opening/closing selectors, inline add/remove split shifts, overnight toggle, dated special schedules and closure date ranges. Retained additional hours under a disclosure.

Verified production version `340de1aa-0d0a-412b-aa3b-2601532bc84f`:
- TypeScript / production build passed. 21 focused tests passed for hours parsing, preservation, overlap/invalid input detection, profile ownership and draft-only mutation.
- Norah's Mon–Sat 11am–7pm and Sunday noon–6pm loaded correctly. Existing dated closures remained unchanged.
- Adding an incomplete date or split shift disabled Save. A completed special-date opening interval enabled Save. Test entries were removed before saving.
- Saved the original schedule as a draft and reloaded to verify persistence. No Google write or publishing action exists in this workflow.
- Location scoping continues through the existing business-keyed component and authorized profile endpoint; parsers allocate independent schedules.
- Desktop reviewed against the Semrush reference: compact rows with status/time selectors, inline plus controls, special dates below. Mobile 390px layout has no horizontal document overflow. No browser console errors observed.
- Browser automation's date fill did not trigger React's native date event until keyboard interaction; verified the real date change via arrow-key selection and corrected the empty end-date fallback.

Artifacts: `C:/Sites/tap-rater-claude/artifacts/business-hours-20261023/desktop.png`, `mobile.png`.
Replaces the previous P3 note about regular/special hours requiring text editing. Unrecognized legacy entries are preserved unchanged under Other saved hours.

final result: passed


## 2026-10-23 Category and payment selectors
- Replaced category free text with primary/additional selection and searchable, paginated Google category results. Existing selections are excluded from other slots; imported IDs remain aligned.
- Replaced payment text with Yes/No/Not confirmed selectors and card-brand checklist dropdown. Preserved unknown imported details; mirrored edits into payment attributes.
- Category lookup authorizes the customer/location before using its observed country and rechecks assignment after the read. Save remains the existing local optimistic-lock draft operation.
- Validation: TypeScript, production build, 28 focused tests passed. Production 180e2d8f-18c3-4ada-8bce-c15a89572218.
- Live Norah: searched women, reselected original primary category, exercised Checks and Visa then restored original choices; saved draft and reloaded successfully. No Google profile writes or publishing.
- Desktop and mobile visual check passed; mobile document width matched viewport (375px), no horizontal overflow. Screenshots in artifacts/business-selectors-20261023.


## 2026-10-23 Grouped business attributes
- Replaced the raw attribute textarea with grouped controls, an attribute-group dropdown, Yes/No dropdowns for business/planning attributes and mutually exclusive Yes/No checkboxes for services, accessibility and amenities. Clearing a checked choice leaves an explicit unconfirmed value.
- Preserved imported social links and unsupported values as read-only details; payment attributes remain in their existing controls. No new attribute values are invented.
- Existing customer/location-scoped optimistic-lock draft save is unchanged; no publishing path added.
- TypeScript, production build and 22 focused tests passed. Live release 018bbbb6-dd0a-40e2-80b6-eefc892f4a5e.
- Verified Norah checkbox clearing/restoring, dropdown editing/restoring, draft save and reload. Original values retained. Desktop/mobile inspected; mobile document and viewport both 375px. Screenshots: artifacts/business-attributes-20261023.
