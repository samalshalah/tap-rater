# Google Business Profile integration

## Audit — October 19, 2026

Existing project: `taprater-review-replies` (130192868056). Keep this project; approval is project-specific.

Google Cloud inspected as Sam: Credentials shows no OAuth clients, API keys, or service accounts. Google Auth Platform explicitly says it is not configured yet. Consequently there are no existing OAuth redirect URIs, audience, test users, or scopes to audit. No Cloud configuration was changed in this audit.

Earlier quota check today showed Business Information API enabled with Requests per minute = 0. Approval is not confirmed. The Google organization and API approval are separate from OAuth consent and client verification.

The production code search found Google review links / Places helpers but no Business Profile OAuth connection, refresh token storage, reviews sync, or reply integration. Existing NFC/link functionality is separate and untouched.

## OAuth implementation — October 19, 2026

The OAuth consent app and Web client were created after owner approval. The app remains External / Testing. Branding uses Tap Rater, Sam as the available support/developer contact, taprater.com, /privacy-policy and /terms. Production redirect is exactly `https://taprater.com/api/admin/google-business/callback`.

Server secrets GOOGLE_BUSINESS_CLIENT_ID, GOOGLE_BUSINESS_CLIENT_SECRET, GOOGLE_BUSINESS_REDIRECT_URI and GOOGLE_BUSINESS_TOKEN_KEY are installed in Cloudflare worker tap-rater-app-git. The token key is independent of the admin session key. Do not rotate it without re-encrypting existing tokens or disconnecting accounts first. Local setup copies are excluded from Git and restricted to the current Windows user.

The database migration in docs/sql/google-business.sql has been applied. These tables use RLS with no public grants. The trusted server database role owns the tables; no browser database connection is used. Apply new environments with `node scripts/setup-google-business-storage.mjs --apply` after loading their database environment.

POST connect, GET callback and POST disconnect routes require a valid signed admin session even in development. Connect/disconnect verify Origin against the server-configured callback origin. OAuth state is hashed, session-bound, expires after ten minutes, and atomically consumed before token exchange. PKCE verifiers and access/refresh tokens use AES-256-GCM with random nonces and context binding. Token refresh uses a database lease and conditional version updates; a missing new refresh token preserves the existing one only for the same Google identity. Tokens are never returned to the browser. Disconnect revokes Google access before removing stored tokens; temporary revocation failures preserve the connection for retry.

OpenID/email scopes identify the connected Google account; business.manage is required before saving. This is a single-admin pilot connection, not a multi-tenant customer service. Live review sync/publishing routes remain unexposed. Testing-mode grants can expire after seven days. An OAuth connection is not API approval.

## Implemented foundation

- Admin-only `/admin/google-reviews`, linked from navigation. Explicitly disconnected, with a fictional sample review and an ephemeral draft preview. No real customer data or Google calls from the page.
- Server transport for accounts, child accounts via parentAccount, locations (required read mask), paginated reviews, and explicit reply submission.
- Runtime response validation, fixed API hosts, resource validation, timeout, no redirects, no cache, sanitized errors, no automatic write retries.
- OAuth URL preparation with random state, PKCE S256, offline access and identity/business.manage scopes, with the connection routes described above.
- Mocked tests exercise pagination, empty data, invalid resources, quota/access/token errors, reply requests, state and PKCE.

## Remaining steps before review service launch

1. Confirm domain verification and OAuth scope verification requirements before public launch. Keep External / Testing for the pilot.
2. Live consent, token exchange, encrypted storage and refresh are verified for admin@taprater.com. Disconnect is covered by tests; a live revocation test was not performed to preserve the authorized connection.
3. Verify deployment and Cloudflare log handling: application code does not log OAuth codes or token bodies; restrict provider request-log access and retention because callback request URLs contain temporary authorization codes.
4. Add a migration/rotation procedure before changing the encryption key. No customer review data is currently cached.
5. Add tenant/connection/location ownership records, migrations and authorization tests before any live API route. API resource IDs must come from API discovery; public organization/group numbers and Maps IDs are not assumed to be API resource names.
6. Enable/check the Account Management, Business Information and Google My Business APIs as applicable. Verify approval and actual quota. A configured OAuth client does not grant GBP API access.
7. Pilot with the authorized Norah Boutique connection. Fetch accounts and child groups, let the admin choose the correct location, paginate reviews, and verify the displayed Google account and business. Restrict stored review data to necessary fields and implement Google-compliant retention.
8. Add persistent reply drafts and a separate explicit publish action with same-origin/CSRF protection, tenant checks, audit history and conflict checks against changed reviews/replies. Do not auto-publish or auto-retry uncertain writes. After OAuth/API approval, manually verify a real read and an authorized test reply.

Live OAuth connection for admin@taprater.com was verified on October 19, 2026. Both stored tokens have authenticated AES-256-GCM encryption; a refresh request to Google succeeded with HTTP 200. Cloudflare deployment c8e893b0-ad61-483c-ae39-83eac2211613 contains the verified runtime fix (commit c622c1e). Cloudflare requires redirect: manual; all Google transports reject non-success responses without following redirects. CI and 30 focused tests passed. No durable draft storage, automated sync, or customer-facing review service is claimed. Account Management API remains disabled and GBP approval/quota remains outstanding. New OAuth secrets were installed; existing production secrets were not changed.

## References

- https://developers.google.com/my-business/content/implement-oauth
- https://developers.google.com/my-business/content/review-data
- https://developers.google.com/my-business/reference/rest/v4/accounts.locations.reviews/list
- https://developers.google.com/my-business/reference/accountmanagement/rest/v1/accounts/list
- https://developers.google.com/my-business/reference/businessinformation/rest/v1/accounts.locations/list
