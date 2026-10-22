# DataForSEO heat maps

Production account: admin@taprater.com. API login/password are Cloudflare secrets
`DATAFORSEO_LOGIN` and `DATAFORSEO_PASSWORD`, never public environment variables.
Apply `docs/sql/dataforseo-heatmaps.sql` before deploying the reader/scheduler.

The existing 15-minute cron calls the authenticated heatmap-scans route. Each
enabled location gets one immutable run per New York calendar period: days
1, 8, 15 and 22. Initial activation starts in the current period, without backfill.
Runs include all active keywords at creation. Changes apply to subsequent runs.
Each run freezes its Google assignment, map anchor and keyword settings.

Norah Boutique is the initial enabled location: three 5×5 grids, 0.5 km spacing,
75 paid tasks per period. Standard Google Maps SERP tasks cost $0.0006 each:
$0.045 per complete location scan, $0.18 for four scans. The target Place ID is
matched exactly against organic Maps results, excluding advertisements. Missing
businesses are labeled not found in the returned results; errors are not ranks.

The shared monthly application cap is $5. The provider also has a $5 daily
safeguard; these are different controls. Auto-recharge stays disabled. No top-up
was purchased. The application cap covers only requests dispatched through this
scheduler, not manual requests or other tools using the provider account.

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
