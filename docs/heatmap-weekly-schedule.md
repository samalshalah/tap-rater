# Weekly campaign defaults

New local_rank_schedules rows default to weekly. A week starts Monday in America/New_York; month and daylight-saving boundaries do not create additional weekly periods. Existing campaigns retain four_monthly (1st, 8th, 15th, 22nd) to preserve previously approved schedules.

Apply supabase/2026-10-24-heatmap-weekly-default.sql before deploying the application. It only adds cadence metadata and changes the insertion default; it does not enable the provider, schedules or manual scans.

Weekly campaigns have a maximum of four scheduled runs per calendar month, plus the existing per-location scan-point entitlement and global provider budget. A fifth weekly opportunity is skipped after the monthly allowance. Each query remains scoped by customer, location and Google assignment. Manual scans retain the explicit quote/approval flow.

Validation: weekly timezone boundary unit tests, existing provider safety tests, and a read-only EXPLAIN of the exact scheduler SELECT against staging. No scan submission endpoint was called.
