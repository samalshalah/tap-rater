# Google Business Profile integration

## Audit — October 19, 2026

Existing project: `taprater-review-replies` (130192868056). Keep this project; approval is project-specific.

Google Cloud inspected as Sam: Credentials shows no OAuth clients, API keys, or service accounts. Google Auth Platform explicitly says it is not configured yet. Consequently there are no existing OAuth redirect URIs, audience, test users, or scopes to audit. No Cloud configuration was changed in this audit.

Earlier quota check today showed Business Information API enabled with Requests per minute = 0. Approval is not confirmed. The Google organization and API approval are separate from OAuth consent and client verification.

The production code search found Google review links / Places helpers but no Business Profile OAuth connection, refresh token storage, reviews sync, or reply integration. Existing NFC/link functionality is separate and untouched.

## Implemented foundation

- Admin-only `/admin/google-reviews`, linked from navigation. Explicitly disconnected, with a fictional sample review and an ephemeral draft preview. No real customer data or Google calls from the page.
- Server transport for accounts, child accounts via parentAccount, locations (required read mask), paginated reviews, and explicit reply submission.
- Runtime response validation, fixed API hosts, resource validation, timeout, no redirects, no cache, sanitized errors, no automatic write retries.
- OAuth URL preparation with random state, PKCE S256, offline access and business.manage scope. This is a helper only: no connect route/callback is exposed yet.
- Mocked tests exercise pagination, empty data, invalid resources, quota/access/token errors, reply requests, state and PKCE.

## Next implementation steps before live use

1. Configure Google Auth Platform in this project: Tap Rater branding, verified taprater.com domain, real privacy/terms URLs, Sam as developer contact and a valid selectable support address. Use External / Testing with only intended pilot users initially. Confirm scope verification requirements in Google's console before public launch.
2. Create a Web application OAuth client. Planned exact redirect: `https://taprater.com/api/admin/google-business/callback`. For development, register an explicit localhost callback separately. The route is NOT implemented or deployed by this foundation.
3. Store client secret and a dedicated token-encryption key in server secrets, never NEXT_PUBLIC variables or Git. Use server-configured callback URL, never a request Host or return URL. Do not print tokens or credentials in logs.
4. Add admin-authenticated start/callback routes. Bind short-lived, single-use state and PKCE verifier to the initiating admin session; validate state/expiry before exchange. Encrypt refresh tokens at rest, preserve old refresh token when Google omits a new one, serialize refreshes, and handle revoked grants. Add revoke/disconnect and data removal. No tokens in browser storage.
5. Add tenant/connection/location ownership records, migrations and authorization tests before any live API route. API resource IDs must come from API discovery; public organization/group numbers and Maps IDs are not assumed to be API resource names.
6. Enable/check the Account Management, Business Information and Google My Business APIs as applicable. Verify approval and actual quota. A configured OAuth client does not grant GBP API access.
7. Pilot with the authorized Norah Boutique connection. Fetch accounts and child groups, let the admin choose the correct location, paginate reviews, and verify the displayed Google account and business. Restrict stored review data to necessary fields and implement Google-compliant retention.
8. Add persistent reply drafts and a separate explicit publish action with same-origin/CSRF protection, tenant checks, audit history and conflict checks against changed reviews/replies. Do not auto-publish or auto-retry uncertain writes. After OAuth/API approval, manually verify a real read and an authorized test reply.

No live connection, durable draft storage, automated sync, or customer-facing review service is claimed by this change. No production secrets were inspected or changed.

## References

- https://developers.google.com/my-business/content/implement-oauth
- https://developers.google.com/my-business/content/review-data
- https://developers.google.com/my-business/reference/rest/v4/accounts.locations.reviews/list
- https://developers.google.com/my-business/reference/accountmanagement/rest/v1/accounts/list
- https://developers.google.com/my-business/reference/businessinformation/rest/v1/accounts.locations/list
