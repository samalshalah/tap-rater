# Stand registry and private assignment drafts (2026-10-24)

- Orders now retain standLineId UUIDs. A stored registry identifies each line/unit independently of array position; existing displayed IDs are retained during migration.
- Existing devices also receive registry entries. Customer reads follow current order/device ownership, and assignments may reference only that customer's businesses.
- Assignment changes write only registry draft fields, with optimistic versions. They do not alter destinations, businesses or published pages.
- Multi-Link saves require a draft version and use atomic customer/page/version conditions. Unsaved popup edits require an explicit discard; failed saves retain edits.
- Migration: supabase/2026-10-24-permanent-stand-registry.sql. Apply before application release. Existing order-item writers must preserve standLineId (or provide explicit new UUIDs for new lines).

Validation: 132 targeted tests passed; TypeScript and production builds passed. Staging SQL exercised item reordering, added quantities and cross-customer rejection with test mutations rolled back. Live migration retained hashes of business records, devices and page content. No checkout, charge, scan or customer-content publication was invoked.

Live client checks: assignment saved and survived refresh, then restored to unassigned. Unsaved Multi-Link edits were retained by Keep editing and removed only by Discard edits. A second tab's stale save was rejected. Original draft hash, published version, business records and device targets remained unchanged.
