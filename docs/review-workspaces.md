# Customer review workspaces

Norah Boutique's existing business record (9fb3ee3b-0920-4db5-a03d-7245987a8751) is linked to the active Tap Rater customer sam.alshalah1@gmail.com. Reused the existing relationship; no new customer, password, activation email, or Google listing was created. Google manager admin@taprater.com remains the separate admin OAuth connection.

Customer route: /account/reviews. Admin route: /admin/google-reviews/workspaces. Customers authenticate with existing customer sessions and active account checks; admins require a signed session even in development. Every read and write enforces business ownership in SQL. Updates use version checks to prevent stale overwrites. POST routes check the configured site Origin and validate input.

Four fictional boutique reviews live only in workspace_sample_reviews. Draft and ready states persist, but ready means practice only. There is no publishing endpoint or Google client dependency in this workflow. Do not migrate sample reviews or replies into live Google data. The workspace mode is constrained to sample by the database.

Schema: docs/sql/review-workspaces.sql. Provisioning script requires --apply, --business-id, and --owner-email, verifies an existing active ownership relationship, and seeds idempotently without replacing saved drafts. Both tables have RLS and PUBLIC privileges revoked. The trusted server database role enforces tenant authorization in application queries.

Before live integration: obtain API approval and usable quota, enable required APIs, discover and select the actual authorized Google location, implement an explicit connection/location ownership mapping, and keep live reviews in separate storage with retention rules. A public Maps ID is not assumed to be a Google API resource name.

Validation: TypeScript, production build, six authorization/validation tests, and real database negative checks for unauthorized and stale writes. Browser verification checks saved draft persistence, preview and practice-ready state after deployment.
