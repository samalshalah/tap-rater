# DataForSEO heat maps

Production account: admin@taprater.com. API login/password are Cloudflare secrets
`DATAFORSEO_LOGIN` and `DATAFORSEO_PASSWORD`, never public environment variables.
Apply `docs/sql/dataforseo-heatmaps.sql`, then `docs/sql/heatmap-methodology.sql` before deploying. Pause paid dispatch during migration, deploy, then restore the provider enabled flag.

The existing 15-minute cron calls the authenticated heatmap-scans route. Each
enabled location gets one immutable run per New York calendar period: days
1, 8, 15 and 22. Initial activation starts in the current period, without backfill.
Runs include all active keywords at creation. Changes apply to subsequent runs.
Each run freezes its Google assignment, map anchor and keyword settings.

Norah Boutique is the initial enabled location. Current testing settings are one 7×7 grid at 2 km spacing and two 5×5 grids at 0.5 km spacing. Standard Google Maps SERP tasks cost $0.0006 each: 99 tasks, $0.0594 per scheduled location scan, $0.2376 for four scans. The target Place ID is
matched exactly against organic Maps results, excluding advertisements. Missing
businesses are labeled not found in the returned results; errors are not ranks.

The shared monthly application cap is $5. The provider also has a $5 daily
safeguard; these are different controls. Auto-recharge stays disabled. No top-up
was purchased. The application cap covers only requests dispatched through this
scheduler, including approved dashboard scans. Requests made by unrelated tools directly to the provider are outside this application cap.

## Budget and failures

The SQL claim function locks the singleton provider row, calculates the current
month's remaining allowance, and reserves integer microdollars before returning
any paid work. Every point has a unique run/keyword/index identity. Reservations
include failed and uncertain requests and are never automatically refunded.
An interrupted paid POST becomes uncertain and is never automatically repeated.
Investigate its provider tag (the point UUID) before any manual remediation.
Result retrieval is free and may retry. Unexpected pricing halts paid work.
Do not reset budgets to re-run a failed scan. The provider must be enabled, have
a nonzero cap, have server credentials, and the location must have an enabled,
matching schedule, active customer, active track and valid Google connection.

New locations are opted in by an administrator through local_rank_schedules,
copying business_id/customer_id/parent/google_subject from the authorized current
local_heatmap_locations row. Never reuse an old customer's schedule after a
location reassignment. Customer API routes cannot alter provider caps or activate
billable schedules. Dashboard history is scoped to the current assignment.

Review publishing remains disabled; this integration has no Google write calls.
Profile drafts and review drafts are unaffected.

## Validation

Unit tests cover calendar boundaries, request restrictions, exact Place ID
matching, malformed/pending responses, response correlation and no paid retry.
The staging-only integration test runs concurrent schedulers against two fixture
locations with a $0.003 allowance, verifies exactly five paid reservations,
retains uncertain costs, checks tenant isolation and prevents duplicate periods.

## Approved extra scans and corrected methodology

Only locations with `local_rank_schedules.manual_enabled=true` may quote and approve extra scans. Norah is enabled for testing; other locations default to false. Quotes are server-priced, expire after 10 minutes, freeze the keyword/grid/version/Google assignment and cost, and perform no provider request. Approval checks current ownership, settings, active schedule and available budget, atomically creates one run and its points, and is idempotent for the quote ID. Dispatch still uses the shared locked budget reservation function; a concurrent budget depletion can pause queued work. No payment is collected from customers.

Changing settings does not start paid work. The latest view only matches the exact saved keyword, grid size, spacing and language using maps-v2; old measurements stay in history. Pending scans refresh every 15 seconds; dispatch and collection run on the 15-minute cron.

Maps-v2 uses fixed zoom 15 with search_this_area=false and search_places=false. This removes the earlier tight viewport restriction and places-search interference. It remains a coordinate-centered Google Maps measurement, not a guarantee of what every physical user sees. Legacy maps-v1 scans are visibly labeled and excluded from the default current-results view.

Staging also tests quotes without billable runs, stale quote rejection, cross-tenant denial, extra-scan gating and concurrent approval deduplication. Replies and profile edits remain drafts.

## Competitor comparisons

Apply `docs/sql/heatmap-competitors.sql` before deploying the comparison feature.
Each point stores up to 20 organic competitors by Place ID, including the rank,
name, address and available five-star rating/review count. Null means not captured;
an empty array means a completed scan returned no organic competitors.

The customer Competitors tab uses the same selected keyword, saved area and scan
history as the heatmap. It shows the customer's own business first, then competitors
by grid presence and average rank. Top-three coverage is the percentage of captured
points ranked 1–3; it is not Semrush Share of Voice or estimated market share.
Uncaptured points are excluded from comparison denominators, not counted as losses.

`competitors` retrieves only existing task IDs for one authorized run and keyword,
within a conservative 29-day retrieval window. It uses free task GETs, never paid
submission. The normal scanner captures competitors for new scans automatically.
Manual new scans still require the existing server-priced quote and approval.
No customer pricing, Google publishing, or profile-writing behavior is changed.
