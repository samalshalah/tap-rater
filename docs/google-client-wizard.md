# Client Google connection wizard

Deployed to production on October 22, 2026, with Google reply publishing disabled.

## Production release
- Worker: `tap-rater-app-git`, version `6c76c396-c02d-40b5-8e3b-eec352652c07`.
- Applied and verified `approved_version` on the actual live database: `winter-grass-30947546` / `br-restless-shape-at38e1nu` (`milestone7-qa`). The deployed `/api/admin/recovery` endpoint confirmed its `ep-silent-queen-at9qd228-pooler` host before migration; the older branch named `production` was not changed.
- Included the latest commerce changes from `b074ce5`. Full suite: 1,589 tests passed, nine opt-in tests skipped. TypeScript, isolated production build, Cloudflare bundle, and deployment dry run passed.
- Used an isolated release folder with real dependency files because the shared Windows dependency junction failed Turbopack/Cloudflare packaging. Deployment preserved existing secrets, bindings, routes, and schedule with `--keep-vars`.
- `GOOGLE_REVIEWS_PUBLISHING_ENABLED` remains `false`. Customer publish and automatic-posting requests are rejected independently of this switch. Approval only records a saved draft version. No reply was published during release.
- The owner selected Norah Boutique for the signed-in production check; MY RIDE staging data was not copied into production.

## Staging validation — October 22, 2026
- Applied and verified the nullable integer `approved_version` migration on isolated Neon branch `google-client-staging-20261022` (`br-flat-brook-at9dr83u`), cloned from the current `milestone7-qa` branch. Shared databases were not migrated. Staging branch expires October 29 at 16:00 UTC.
- Ran the production Next build locally at `http://localhost:3036` against that branch, with separate session signers and Google publishing explicitly disabled. This is local staging, not a public deployment.
- Completed real Google OAuth in Sam's Chrome profile as `sam.alshalah1@gmail.com`, including the customer callback and namespaced token storage. Temporarily registered the localhost callback with user approval, then removed it after testing; reconnecting locally requires registering it again.
- Used the browser wizard to discover MY RIDE, select Sam Alshalah's workspace, and import every review page automatically. Independently read Google's total: **303**. Database: **303 unique reviews**, no remaining cursor, no sync error, automatic posting false.
- Saved, approved, and edited a staging draft through the authenticated HTTP routes. Exact-version approval succeeded; stale approval returned 409; editing invalidated approval. Browser approval and preview also passed. The final test draft is approved only in staging.
- Direct authenticated publish requests returned 403. All 303 stored reviews remained idle with zero publish attempts. No replies were published.
- Focused regression suite: 8 files, 67 tests passed. Evidence is stored outside source control under `C:/Sites/tap-rater-claude/artifacts/google-staging-20261022/`.
- Google still presents its unverified/test-app notice during OAuth. Production OAuth verification remains a prerequisite for broad client rollout.

## Rollout
1. Apply `docs/sql/google-client-wizard.sql` before deploying; it adds nullable `approved_version` and preserves existing data.
2. Include these changes alongside the latest production commerce changes. This checkout is the Google integration branch, not the latest buying-experience branch.
3. Keep GOOGLE_REVIEWS_PUBLISHING_ENABLED false. Client API calls to publish/automatic posting are rejected regardless of that flag; customer-owned links are also blocked from publication by admin/maintenance code.
4. Finish Google OAuth production verification before general client rollout. No new Google redirect URI is required: the existing registered admin callback routes customer flows using a short-lived HttpOnly state cookie, then verifies the active customer session and the existing one-time PKCE state.
5. Smoke-test with a consenting client in staging: connect, inspect returned business/address, select their own workspace, import multiple pages, save/edit/approve a draft, stop access. Verify a second client cannot read or bind the first client's workspace.

## Behavior
- Customer tokens use a separate `customer:<normalized email>` owner. The agency connection is never used by the customer discovery endpoint.
- Discovery follows account/location pagination and supports browsing account groups. Binding checks active workspace ownership server-side and verifies a real Google review read before inserting the link.
- Initial imports and incomplete imports continue automatically while the page is open. Page cursors are persisted; existing maintenance also advances enabled links when its scheduled worker runs. Keep the existing maintenance schedule configured for continuation after clients close the browser.
- Import requests are sequential with an 11-second gap; transient busy/quota/unavailable responses get up to two retries. Errors preserve the cursor and expose a resume button. Existing drafts are preserved by review upserts.
- Saving a draft changes its version. Approval records that exact version; later edits or Google review changes invalidate the displayed approval. Approval never invokes Google publishing.
- No production database, OAuth settings, Google permissions, review replies, or deployment changed in this implementation task.


## Business account and production verification preparation — October 22, 2026

- Business identity: `admin@taprater.com`. The Google Cloud Owner invitation was saved with explicit approval; Google currently reports **Invitation sent. Pending acceptance**. Sam remains an Owner during the transition. Google Cloud first-use terms were accepted for the business account with separate approval.
- The business Google account uses an external mailbox, not Gmail. Its project invitation must be accepted before completing administration under that identity. Do not create a Gmail address to replace it.
- Next, sign in as the business account, verify project access, and change both OAuth user-support email and developer contact email to `admin@taprater.com`. Sam's current support-email dropdown only offers Sam; changing a text contact alone does not complete this transition.
- Existing project: `taprater-review-replies`, number `130192868056`. Retain the approved API project and existing production client/callback. Do not migrate clients to a new unapproved project.
- Current OAuth audience is External / Testing, with only admin and Sam as testers. Norah was not added. General client onboarding remains blocked until production rollout is completed.
- Google Auth Data Access currently classifies `business.manage`, `userinfo.email`, and `openid` as non-sensitive; sensitive and restricted tables are empty. Do not assume sensitive-scope verification or a security assessment is required. Follow the actual Verification Center requirements after production status is selected.
- Existing branding: Tap Rater; homepage `https://taprater.com`; privacy `https://taprater.com/privacy-policy`; terms `https://taprater.com/terms`; authorized domain `taprater.com`; no logo uploaded. Verify domain ownership in Search Console for a project Owner/Editor before submission. Ownership has not yet been checked in this task.
- Prepare the production audience and branding review under the business account; inspect any required declarations before submission. Google review/approval has not been requested or granted by this task. Production OAuth availability is separate from the Google reply-publishing switch.
- Review-service explanation for verification: authorized customers connect their own Google account, select a Business Profile and their own Tap Rater workspace, import all review pages, and prepare/approve drafts. No customer reply is sent to Google. Tokens are stored encrypted and are scoped to the signed-in customer's connection. Optional AI processing requires separate settings consent.
- Onboarding now explains how owners separately invite `admin@taprater.com` with the Manager role using Business Profile settings > People and access > Add. The UI does not send invitations or falsely mark them accepted. Customers retain ownership. OAuth authorization does not automatically grant manager membership, and disconnecting OAuth does not remove a separately invited manager.
- Before announcing general availability: confirm the business account's active ownership and business support contact; complete Google's actual production/branding checks; test with a consenting non-test customer; confirm only that customer's locations/workspace appear; confirm full review pagination and no publish attempts. Keep `GOOGLE_REVIEWS_PUBLISHING_ENABLED=false` and all client/server draft guards.
- Reference: https://developers.google.com/identity/protocols/oauth2/production-readiness/brand-verification and https://support.google.com/business/answer/3403100.

- Business onboarding release deployed as Worker version `e2f81d45-b043-4bee-9f65-0e43afe00cd8`. Verified in the signed-in Norah production workspace: invitation instructions render with the business email, and draft-only status remains visible. TypeScript, 34 focused tests, production build, and deployment dry-run passed; deployed publishing flag remains false. No database change was needed.
