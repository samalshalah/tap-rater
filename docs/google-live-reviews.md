# Live Google reviews: activation and operations

Implemented in the existing taprater-review-replies project, using the existing encrypted managing-account OAuth connection. No second Google Cloud project or customer developer project is required.

## Current deployment

Live publishing defaults to false in BOTH wrangler.jsonc and wrangler.cloudflare-git.jsonc. There are no assigned live locations while approval is pending. Fictional sample reviews live in a different table and cannot enter the publishing API.

Apply docs/sql/google-live-reviews.sql before deploying these routes. The migration adds RLS-protected tables without altering sample data.

## After Google approval

1. Confirm usable quota and enable the Account Management, Business Information, and Google My Business v4 APIs required by the client. OAuth consent/verification is separate from Business Profile project approval. External/Testing tokens may need reconnecting after seven days; complete the applicable OAuth production review before broad onboarding.
2. At /admin/google-reviews, reconnect the managing account if needed and use Check Google access / load accounts. Browse organization child accounts when needed; paginate accounts and locations.
3. Select the precise Google location and active customer business. Confirm the customer authorized management. Assignment re-reads locations and requires a successful Google review read. A location can be assigned only once. The mapping records the customer ID and Google identity, so changing business ownership or OAuth identity invalidates access.
4. Sync all pages. Confirm the location, review authors, star ratings, and existing public replies against Google, while publishing remains locked. Scheduled maintenance syncs one page per business, up to four businesses per 15-minute run, rotating by last checked time. Immediate user syncs are throttled to 10 seconds.
5. After the owner approves live activation, set GOOGLE_REVIEWS_PUBLISHING_ENABLED=true in both deployment configs and deploy. This is a global write kill switch; turning it off blocks manual and automatic writes. Confirm a real customer-approved reply in a controlled test and verify the resulting public reply on Google. Never publish fictional sample content.
6. Customer AI consent permits review text/rating and the business name to be processed by Cloudflare. Four editable suggestions are available; save a draft before publishing. Publishing requires a separate confirmation and sends only the saved, version-checked text.
7. Automatic posting remains off per business. Customers must explicitly authorize it with selected 4/5-star ratings and style. Only reviews created after this consent, with no existing reply or draft, qualify. Settings changes restart the consent window. 1–3-star reviews always stay manual. Each business is capped at 20 AI generations daily. Automatic generation failures or uncertain writes are not silently retried; review them manually.

## Publishing failures

A Google write is preceded by a fresh review read and a conditional database claim. Concurrent draft edits, ownership changes, disabled settings, and changed Google replies block the claim. If Google times out or returns an unclear result, the UI shows publishing/uncertain and prevents further writes. Check publish result performs GET only. A matching reply confirms success. After five minutes, a differing result can be returned to manual review; no automatic retry is sent. An already-dispatched request can finish after stopping access, which the UI discloses.

## Retention and ending service

Google review content is cached only for this workflow. Successful syncs refresh the cache; content older than 30 days is excluded from reads and deleted by the existing scheduled worker. Complete syncs remove reviews absent from Google's current list, except unresolved writes awaiting reconciliation. Drafts associated with expired/removed cached reviews are removed too. Do not include these cache tables in long-lived exports or backups.

Customers can stop local Google review access even when OAuth is revoked. This disables sync, AI, and auto-posting. Google agency-manager membership is separate: support must remove Tap Rater's manager access when the client ends the relationship, within Google's required period. Admins can remove a stopped local assignment and its cached content/drafts. Disconnecting or changing the central Google account makes affected mappings unavailable; it never reassigns them to another identity silently.

## Validation

Unit and HTTP tests use simulated Google responses; they do not publish real replies. Coverage includes tenant authorization, CSRF, confirmation, sample isolation, pagination, drafts preserved by sync, stale Google replies, concurrent changes, uncertain publish reconciliation, AI consent/quota, and automatic eligibility. Live Google read/write verification remains an activation prerequisite after approval.

Official references:
- https://developers.google.com/my-business/content/review-data
- https://developers.google.com/my-business/content/policies
