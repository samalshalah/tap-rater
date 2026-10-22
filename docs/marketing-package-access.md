# Reviews package access

The Reviews package grants all customer marketing tools across the account's owned locations: reviews and approval drafts, Google Profile drafts, heat maps, directories, reports, and issue tools. Stand orders and hosted-stand subscriptions do not grant this entitlement.

`customer_marketing_access` is the authoritative server-side entitlement. `active` and explicit `testing` grants are allowed until `expires_at`; missing, inactive, expired, or unreadable grants fail closed. Norah's existing testing account is seeded explicitly. No other account is inferred from connections, locations, or orders. Existing tenant and location checks still run after entitlement checks.

Customer pages do not mount the marketing client components without access. Every marketing API read/mutation and customer Google OAuth completion checks entitlement. Scheduled reviews, draft generation, heat-map scheduling, and queued paid scan claiming require access. Previously paid scan retrieval can complete; cached customer data is retained.

The Get Reviews package CTA opens `/account/packages`. Request package details records one idempotent internal request per customer. Admin Usage displays only account name, operational access status and request date. No checkout, price, payment, email, or automatic activation is triggered. When pricing is launched, a verified payment/subscription lifecycle must set/revoke this entitlement; a package request must never do so.

Migration: `supabase/2026-10-22-marketing-package-access.sql`. Tables have RLS enabled and no public policies. Access changes are a trusted administrative database operation until a dedicated admin grant workflow is added. Preserve audit records when that workflow is implemented.

All review replies and Google profile edits remain drafts. Publishing configuration remains disabled.
