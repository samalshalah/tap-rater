# Customer workspace design

The approved compact Option 1 design is implemented in `src/app/workspace.css` and `src/components/account/workspace-ui.tsx`. It applies to the authenticated customer workspace, not the public storefront. The standalone design prototype is a reference only; its simulated actions and data are not application code.

## Rules for additions

- Put authenticated customer pages inside `src/app/account/(workspace)`. The route group does not change URLs. Keep login, activation and password recovery outside this layout.
- Reuse `WorkspacePageHeader`, `WorkspaceToolbar`, `WorkspaceMetrics` and `WorkspaceLoading`. Use existing form, table and dialog components and their real action handlers.
- Use the shared tokens: page titles 18px, section headings 13px, body 13px, metric values 20px, section gap 8px, panel padding 10px and corner radius 4px. Do not introduce page-specific headline sizes or marketing-style hero sections.
- Keep the business selector and address in `AccountContext`. Repeat business identity only when needed to distinguish rows, locations or an editing target.
- Use `tr-button-primary` for the main action and `tr-button-ghost` for secondary actions. Keep destructive, disabled, loading and error states meaningful.
- Preserve capability checks, URL location selection, endpoint contracts, validation, consent, draft/publish separation and dialog focus handling. A visual redesign is not permission to change them.
- Keep dense desktop controls and larger mobile touch targets. Tables retain their horizontal scrolling containers. Do not clip content to make a page look shorter.
- Keep compatibility overrides scoped under `main.tr-app-shell`. Never put new dashboard appearance rules into public storefront styles.

## Local implementation validation (2026-10-24)

- All 22 existing account page URLs remain (including authentication routes and the billing/devices aliases); 18 authenticated pages share the workspace layout.
- Production compilation and TypeScript passed using `next build --webpack`.
- 158 tests in 17 focused suites passed, covering customer access/navigation, location selection, purchases, Multi-Link, orders, reviews, Google profile management/publishing, settings, heatmaps, stand proofs, business drafts, directory contracts and automation dialogs.
- Visual checks use real application components in the ignored local fixture harness at port 4318, with sample data. These checks do not prove live Google, billing or database integrations end to end.
- No deployment or remote data changes were performed.

The previous full-suite baseline includes unrelated failures recorded in the local baseline logs. The focused result above is not a claim that the entire repository suite is green.
