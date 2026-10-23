# Marketing access, allowances and suspected spam

Status: implemented locally; migration and integration tests applied only to the isolated `google-client-staging-20261022` Neon branch. Not deployed to production.

## Scope

- Admin usage includes manual account access, expiry, location slots, and per-location monthly AI/heat-map point allowances. No price or checkout is created. Admin responses contain account name and operational usage, not customer profile/review content.
- Database row locks serialize slot assignment and shared review/profile AI allowance reservations. Heat-map point claims enforce both the existing global budget and location allowance. The migration pauses the ranking provider, including existing schedules.
- GBP draft generation uses the selected location's verified facts and works for eligible package locations without a Norah-specific preview grant. Existing daily abuse safeguards remain.
- Review popups allow reversible suspected-spam flags. Flags remain private, survive imports, preserve existing drafts, clear approval and block AI drafting/approval while flagged. They do not report or delete Google reviews.

## Rollout

Apply `supabase/2026-10-22-marketing-package-access.sql` if missing, then `supabase/2026-10-23-marketing-entitlements-spam.sql` before the application release. Existing heat-map competitor schema must already be present. Existing connected location slots are preserved.

Default operational allowances are one location, 100 shared AI attempts per location/month and 300 scan points per location/month; existing location counts are preserved. These are configurable test allowances, not published subscription plans. Usage enforcement counters begin at this migration; historical actual costs remain in the existing cost ledger. Counters reset on the New York calendar month. Failed/uncertain attempts consume allowance to prevent retry overspend.

The follow-up Growth subscription implementation adds retail billing, renewal, cancellation and payment-failure synchronization; see `growth-subscription-launch-20261023.md`. Manual access is not evidence of payment. Live pricing remains inactive. Keep ranking provider disabled until separately authorized.

## Verification

- TypeScript check passed.
- Production build passed with `next build --webpack`. Default Turbopack cannot resolve this checkout's external node_modules symlink; no source workaround was introduced.
- 92 targeted unit tests passed.
- Three staging database integration tests passed: concurrent limits and tenant separation; review import/draft automation with an injected AI provider; location-specific GBP issue drafts. No paid scans or live AI generation were used by these tests.
- Suspected-spam flags persist through an injected Google import; cross-account flagging is rejected, existing drafts survive, and stale edits are rejected.
- The broad test run exposed 21 pre-existing failures in account-orders-page, admin-dashboard-counts and customer-multilink-pages. The same failures reproduce on the unchanged release checkout. Five new mock/expectation failures were corrected and their suites now pass.
- Browser verification of the new controls and production rollout remain pending. Do not treat this as retail launch certification.
