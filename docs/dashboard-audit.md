# Local dashboard audit — October 24, 2026

Scope: the 16 customer dashboard routes on localhost:4340, using the isolated PGlite sample account. Nothing deployed. External fetch/HTTPS attempts remain blocked.

## Fixes
- Shared popup heading size and card padding are consistent across detail and edit dialogs.
- Secondary buttons and icon controls share compact desktop sizes, retaining larger touch controls.
- Stand thumbnails and the directory total follow the shared density/metric scale.
- Multi-Link editor sections no longer stretch to fill the preview height; redundant section captions removed.
- Nested modal cancellation no longer closes its parent editor. Tab trapping stays in the active popup; Escape returns focus to its trigger.
- Feedback uses server-authorized local security simulation only in development with the exact isolated database. Production verification remains required. Sample submissions persist locally and notifications use the local outbox.

## Verified
- All 16 customer route responses: HTTP 200, local simulation banner.
- Visual review of each route; Overview, Reports, Business Information and Issues revisited after asynchronous loading.
- Browser checks: stand assignment save, location draft save, stand/order dialogs, report period change, report/metric/chart/completeness popups, all business profile sections, issue detail popup, nested Multi-Link detail Escape/focus return, Multi-Link draft save, feedback submission.
- Service checks: local checkout completion, cancellation/resume, Google connect/sync/profile publication, AI issue draft, review suggestion/save/publication, heat-map quote/approval, local Multi-Link publication, password-reset test email and account settings persistence.
- Feedback database read confirmed the submitted sample message is saved.
- Focused customer dashboard regression run: 474 passed, 6 skipped (before the additional nested-modal regression); subsequent modal/editor tests passed. Security/stand tests passed. TypeScript passed.

## Follow-up: remaining failures resolved
- Full repository suite: **2,051 passed, 0 failed, 24 skipped**. JSON evidence: `.local-sandbox/full-tests-fixed.json`.
- TypeScript passed. Platform schema CLI passed. Recovery readiness passed all 48 checks.
- Admin count tests now isolate the unrelated async client panel; order-layout tests provide the required stand registry fixture. Their original assertions remain in place.
- Header fixtures now declare purchased services and verify both entitled and unentitled navigation.
- Client-review tests follow the documented October 23 opt-in publication policy, checking the deployment lock, exact-reply publication through a fake provider, explicit consent and stale-queue invalidation.
- Schema parsing was separated from the executable entrypoint to avoid Vitest's hashbang import failure. The Node CLI still works.
- Recovery checks now match the minute scheduler and 5,000-subrequest configuration introduced by commit b813481. Deployment configuration was not changed.
- The checkout location-count input now uses the shared accessible input class.
- Re-ran the 16-page/login/persistence/network-isolation smoke check and local service simulation transactions successfully.
- Strengthened `check-simulations.mjs` to assert outcomes instead of merely printing status codes. It verifies all report periods, persisted directory changes, stale edit rejection, Knowledge Center saves, review spam protection/suggestion/save/approval/publication, heat-map settings/quote/approval/sample results, feedback, CSRF and unauthenticated access. All passed. It requires at least one unanswered sample review and changes only sample data.

## Validation limits
The 24 skipped tests need separate external test environments; none were enabled against real services. Local simulations verify application behavior, not real Google/payment/email delivery. Directory automatic distribution/duplicate discovery remain unavailable as indicated in the existing UI. No production build or deployment performed.

## October 25 typography follow-up
- Browser computed-style audit covered all 16 navigation routes: page titles 14px and section headings 11px.
- Opened the shared help/report/chart/completeness/device/package popups, all 11 business-profile field editors, review knowledge/settings/schedule, scan-point details, directory editors, location/assignment/stand editors, billing order/licence and account contact dialogs. Popup titles were 12px; subsection headings 11px. Checked closing with Escape, including nested Multi-Link focus return.
- Corrected CSS specificity for class-bearing dialog headings so editor titles use the same 12px token. Corrected corrupted punctuation in the reply-schedule popup.
- Re-ran local route/isolation verification, service simulations and mutation assertions successfully. Saved the sample reply schedule through the UI and confirmed its success message.
- Full suite: 2,051 passed, 0 failed, 24 skipped (`.local-sandbox/typography-audit-tests.json`). After the punctuation-only repair, 25 scheduling/modal tests passed. All work remained local.

## Popup content-fit follow-up
- Measured 33 secondary-detail popups across the navigation routes; all fitted the viewport and closed with Escape.
- Found native business-field dialogs stretching to 847px because `height:auto` combined with inset positioning. Replaced it with `fit-content` in the shared dashboard rule. Rechecked all 11 field editors: short forms are 140–240px, longer social/payment/hours forms 473–633px at the tested desktop viewport.
- Verified Close controls, Apply + Save draft persistence after reload, Cancel discarding pending edits, stand assignment save/reopen, account save/reopen, and order/licence/detail popup fit.
- All local route/network-isolation checks and service-simulation checks passed again. The 46 focused modal/scheduling/stand/Multi-Link regression tests passed after the sizing fix.
- Only local sample records changed. No deployment or real-service delivery occurred.
