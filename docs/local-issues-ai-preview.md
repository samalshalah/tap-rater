# Client issue notifications and AI preview

Apply docs/sql/local-issues.sql before deploying. Notifications are available under /account/notifications and in the account/local-dashboard banners. The authenticated account API is /api/account/local/issues; the admin equivalent is /api/admin/local/issues. Location, owner and Google assignment are checked server-side.

Checks run when the notification views load and once per minute while open. They use cached Google snapshots and corrected completed Maps scans; they do not crawl the website or send email. A changed finding becomes unread again. Reviewed is distinct from resolved. Missing/failed/legacy scans are data issues, not paid-AI opportunities. Missing facts require customer confirmation. Observations contain dates and sources.

Pricing and checkout are deliberately not configured. The owner asked to evaluate agent capabilities first. Client requests record intent and never charge. Only locations explicitly enabled in local_issue_access can generate previews; Norah is enabled. The preview uses the existing Cloudflare REVIEW_AI binding, allows ten attempts per location/day and requires 15 seconds between attempts. Repeat requests return an existing draft for the same finding. Failed jobs can retry; overlapping attempts cannot overwrite each other.

AI can prepare a profile-description proposal or a visibility/profile improvement plan. It cannot modify Google rankings, publish replies, change hours or addresses, update directories or edit a website. Facts remain questions when unverified. Drafts are stored separately from existing profile drafts. Approval records review only, without applying the draft. No Google write methods or Stripe payment calls are present in this feature.

Next pricing phase must add server-priced quotes, explicit approval, authenticated payment confirmation, idempotent fulfillment and a visible total before any charge. Do not turn a requested_at value into consent to charge.

Tests cover tenant and location isolation, stale findings, preview gating, deduplicated generation, unchanged profile drafts, AI JSON validation, and false positives from incomplete or mismatched scans.
