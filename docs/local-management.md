# Tap Rater Local

Deployed to production October 22, 2026. Customer dashboard: https://taprater.com/account/local. Admin dashboard: https://taprater.com/admin/local.

## Customer and location model

One customer owns many `businesses` rows. Each row represents a location with its own ID, address, Google assignment, review cache, draft approvals and directory records. Existing Google assignments and Norah's production reviews are preserved. A Google authorization can supply several locations; each is explicitly assigned to a different Tap Rater location. Onboarding shows addresses to distinguish locations with the same name.

Customer route: `/account/local`. Admin route: `/admin/local`. Both reuse the existing shells and design system. Features include all-location overview, customer filtering for administrators, location switching, search, location creation, review/draft counters, directory records with manual status/URL/listed business details/correction notes, and the existing Google review import and draft approval workflow. Review filters operate on loaded review pages and retain the load-more action.

Directory statuses are manually maintained. This implementation does not syndicate to Apple, Bing, Yelp or other directories, scan duplicates, or claim a listing is API-connected. Automatic distribution requires a separately configured provider integration and its commercial/API access. No Semrush business data is copied into Tap Rater.

## Reference inspection

Inspected the signed-in Semrush Local dashboard, location listings and review management pages in Hussam's Chrome. Used location/group organization, summary cards, tabs, directory status table, business-detail columns and review filters. Kept Tap Rater branding and draft-only reply controls. Screenshots are outside source control at `C:/Sites/tap-rater-claude/artifacts/semrush-local-reference/` (`dashboard.png`, `listings.png`, `reviews.png`). This is a visual/workflow reference, not access to Semrush's backend implementation.

## Storage and authorization

Apply `docs/sql/local-management.sql` with `node scripts/setup-local-management.mjs --apply` after loading the intended database environment. The additive migration enables RLS without public policies. The existing server role accesses it through authenticated routes. Customer identity comes from the session; ownership and active account checks are part of both reads and writes. Directory saves use optimistic versions; stale writes return 409. Only http(s) links without URL credentials are accepted. No directory deletion or publishing action is exposed.

Local review screens force draft-only controls. Existing server-side customer publication blocks and production `GOOGLE_REVIEWS_PUBLISHING_ENABLED=false` are unchanged. Adding a location does not grant Google access or send a manager invitation.

## Validation and staging

- Migration applied only to `google-client-staging-20261022` / `br-flat-brook-at9dr83u`, endpoint `ep-lively-star-at7d9rqv`.
- 61 focused validation, HTTP authorization, navigation and Google draft/publication regression tests passed.
- Live isolated database integration test passed: two locations under one customer; another customer cannot list/change their records; stale edits cannot overwrite newer changes. Test fixtures cleaned up.
- TypeScript, OpenNext production build and Cloudflare deployment dry run passed.
- Browser staging at `http://localhost:3037/account/local`: signed in with a synthetic preview account, added a third location, saved a directory correction, verified the overview shows three locations and the listing belongs only to the selected location.
- Screenshots `taprater-overview.png` and `taprater-listings.png` show synthetic preview records, not real customer results. Preview data remains on the expiring staging branch for review.
- No production migration or deployment was performed for this feature. No external listing or review reply was published.

For release, apply the additive migration to the verified LIVE branch `br-restless-shape-at38e1nu` (named `milestone7-qa`, not the obsolete branch named production), then deploy the tested build preserving bindings and the false publishing flag. Keep existing commerce changes intact.

## Production release — October 22, 2026

- Applied the migration transaction to the verified live branch `br-restless-shape-at38e1nu`. `/api/admin/recovery` confirmed `ep-silent-queen-at9qd228-pooler` before migration. RLS enabled; directory table initially empty.
- Deployed the source-matched, tested bundle with `--keep-vars`. Worker `tap-rater-app-git`, version `09cfce15-0bdf-437f-b500-ddf73d9dba48`. Existing routes, bindings and 15-minute schedule preserved.
- Confirmed signed-in customer dashboard shows only Norah Boutique: 22 imported reviews, two unanswered, Google connected. Admin dashboard lists the existing multi-location accounts with customer and location selectors.
- Production API confirms publishingEnabled=false and auto_enabled=false. Reply attempts remained zero through migration and deployment. No replies or external directory updates were published.
- Evidence: `C:/Sites/tap-rater-claude/artifacts/semrush-local-reference/production-dashboard.png`.

## Directory workflow release â€” October 22, 2026

The client confirmed that no distribution provider is connected and requested management first. Added per-location canonical profiles (name, address, phone, website, category, description and hours), an eight-directory starter checklist plus custom directories, all-location search/status filters, progress counters and recorded-detail comparisons. Checklist entries begin as Not checked and are not invented scan results.

Corrections progress through draft, approved, manually submitted and resolved. These actions only update Tap Rater. Any correction edit resets approval. Location profile changes invalidate earlier approvals; both profile and listing versions are checked atomically, including at approval time. Account ownership and active status are enforced inside each write. No API syndication, automated scans or external submission is enabled.

Applied docs/sql/local-directory-workflow.sql to isolated staging and verified live branch br-restless-shape-at38e1nu. Production Worker version d18fbe77-1569-4ee9-ace0-0746f720c5b6, preserving false review publishing flag and the 15-minute background schedule.

Validation: 33 focused unit/HTTP/review regression tests; real staging integration verifies multiple locations, cross-account rejection, stale writes, unchecked correction rejection, approval invalidation and the complete manual state progression. TypeScript, production build and deployment dry run passed. Browser tested profile editing and correction approval with three synthetic staging locations. Production Norah view has eight unchecked directories, 22 reviews, two saved drafts and zero publishing attempts. Its directory profile still needs address, phone, website, category and hours entered by the client; no unverified details were filled in.
