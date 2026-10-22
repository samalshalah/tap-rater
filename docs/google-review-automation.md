# Automatic Google review imports and drafts

The production Worker runs authenticated review maintenance every 15 minutes. It selects up to 12 active connected locations, oldest checked first, continues paginated imports, and prepares at most one unanswered review draft per location per run. Larger queues continue on subsequent runs. All star ratings are eligible.

Each location controls AI permission and reply style. Customer connection confirmation discloses Cloudflare AI processing and enables drafting; existing locations enable it in Automatic imports and reply drafts. Disabling AI permission stops generation without stopping imports. Admin-created connections require explicit activation of this setting.

Generation shares the existing limit of 20 requests per location per day with manual suggestions. Provider failures and quota limits remain queued, with a visible error. Atomic claims, version checks, current ownership, active account, Google identity, and settings checks prevent duplicate work or overwriting concurrent edits. Existing Google replies and saved or approved drafts are preserved. Clearing an automatically generated draft does not cause it to regenerate.

Clients edit, save, and approve drafts in the Local Dashboard. Approval does not publish. Scheduled maintenance contains no Google reply write call and returns published: 0 even if a publishing environment flag changes. Production GOOGLE_REVIEWS_PUBLISHING_ENABLED remains false; customer connections also reject publishing server-side.

Apply docs/sql/google-review-drafts.sql before deploying. Validation covers draft eligibility, concurrency, tenant/setting guards, failures, and publishing isolation, plus a disposable-fixture integration test on the dedicated staging database. No synthetic reviews are added to production.

October 22, 2026: enabled automatic drafting for Norah Boutique at the owner's request. Its two existing, unapproved human-written drafts are preserved.
