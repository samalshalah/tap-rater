# Customer review workspaces

Norah Boutique's existing business record (9fb3ee3b-0920-4db5-a03d-7245987a8751) was initially linked to sam.alshalah1@gmail.com. On October 19, the owner confirmed norahboutiqueva@gmail.com, a new pending customer was created through the live admin form, and this business/workspace was transferred to that customer. The customer subsequently activated and signed in; saved drafts were verified from Hussam's Chrome profile. No devices, subscriptions, hosted pages, submissions or tap events were linked to the transferred business. Google manager admin@taprater.com remains the separate admin OAuth connection.

Customer route: /account/reviews. Admin route: /admin/google-reviews/workspaces. Customers authenticate with existing customer sessions and active account checks; admins require a signed session even in development. Every read and write enforces business ownership in SQL. Updates use version checks to prevent stale overwrites. POST routes check the configured site Origin and validate input.

Four fictional boutique reviews live only in workspace_sample_reviews. Draft and ready states persist, but ready means practice only. There is no publishing endpoint or Google client dependency in this workflow. Do not migrate sample reviews or replies into live Google data. The workspace mode is constrained to sample by the database.

Schema: docs/sql/review-workspaces.sql. Provisioning script requires --apply, --business-id, and --owner-email, verifies an existing active ownership relationship, and seeds idempotently without replacing saved drafts. Both tables have RLS and PUBLIC privileges revoked. The trusted server database role enforces tenant authorization in application queries.

Before live integration: obtain API approval and usable quota, enable required APIs, discover and select the actual authorized Google location, implement an explicit connection/location ownership mapping, and keep live reviews in separate storage with retention rules. A public Maps ID is not assumed to be a Google API resource name.

Validation: TypeScript, production build, six authorization/validation tests, and real database negative checks for unauthorized and stale writes. Browser verification checks saved draft persistence, preview and practice-ready state after deployment.


## AI suggestion and automatic draft trial
Cloudflare Workers AI binding REVIEW_AI uses @cf/meta/llama-3.3-70b-instruct-fp8-fast. Each generation returns four validated style choices: friendly, professional, personal and short. The customer explicitly selects a suggestion, edits it and saves it. Nothing is sent to Google. Sample review text, rating and business name are sent to Cloudflare; no OAuth token, login email or reviewer identity is included.

Apply docs/sql/review-ai.sql before deployment. The per-workspace settings are off by default, independently select 4/5 stars and use optimistic settings version checks. The 15-minute existing worker scheduler runs a bounded sample-only draft job. It processes one eligible blank review per workspace per run, up to four workspaces, and never publishes. A claim timestamp prevents simultaneous duplicate work; failed attempts retry no sooner than 15 minutes later. A post-inference conditional update rechecks settings and review versions, ownership and blank reply. Existing replies and ratings 1–3 stay manual.

Atomic per-workspace counters allow at most 20 attempts per database day, with a 10-second minimum interval. Failed generations consume allowance. Maximum output is 1,200 tokens and input review is capped at 6,000 characters. Suggestions are not persisted until selected and saved; automatic outputs save as drafts. All AI requests require authentication, tenant ownership and same-origin checks. Malformed AI output fails without replacing replies. No live-review sync, live publish endpoint, or automatic Google publishing is implemented; launch requires separate location authorization, opt-in and validation after API approval.
