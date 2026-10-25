# Dashboard density contract

Customer dashboard pages use `src/app/workspace.css`, scoped to `main.tr-app-shell.tr-client-shell`. The compact application contract at the end supersedes legacy customer styles in globals.css. Do not add page-specific large type or spacing overrides there.

- Page title: 14px; popup title: 12px; section title and form label: 11px; body and navigation: 11px; secondary label: 10px; metric: 16px. This compact scale follows the user's reference and subsequent request for smaller titles; it is not a claim about Semrush source CSS. Apply the heading scale to dialogs as well as page content, including headings without utility classes.
- Main spacing: 6px between related sections, 8px card padding, 28px desktop controls. Small-screen controls retain 36px minimum height and 16px input text.
- Use WorkspacePageHeader, WorkspaceToolbar and WorkspaceMetrics from workspace-ui.tsx. Put explanatory page introductions in the header help disclosure.
- Show the selected business and address once in the shared workspace header. Keep identifiers in editable fields, multi-location lists, comparison rows and dialogs where needed for the action.
- Consolidate related actions into toolbars. Display totals once; do not repeat metric cards as navigation shortcuts.
- Keep warnings, approval details, errors, labels and keyboard focus visible. Do not achieve density by hiding functions or truncating essential decisions.
- Verify real pages with sample data and their dialog states after changes. The local service simulation remains independent of presentation.
- Popup surfaces must use content-driven height with a viewport maximum and scrolling for long content. Only the transparent modal overlay fills the viewport. Avoid fixed-height content panels; use 8px section gaps and 10–12px padding. Keep media previews bounded and scrollable independently.
- Detail-bearing list rows should open their details when the user clicks non-interactive row content. Use `activateListRow` with `data-dashboard-row`; retain a native detail button/link for keyboard access. Never intercept nested buttons, links, form controls, dialogs, modified clicks or selected text. Keep identity and secondary metadata inline beside icons, with wrapping on narrow screens instead of clipping or hiding information.

October 24 compact pass: unified legacy button/input/header overrides; reduced card/table/form/metric padding; moved descriptions to help; combined profile automation and refresh controls; condensed profile completion/media; consolidated heat-map tabs and schedule, removed repeated business/keyword labels, reduced metric strip; removed duplicate Overview review totals; kept all route handlers and service actions.

Secondary information uses WorkspaceDetails (workspace-details.tsx): a labeled trigger and native modal with Escape, focus containment and return-to-trigger. Use it for explanations, completeness breakdowns, timestamps, identifiers, chart data and package allowances. Keep errors, prices, renewal terms, approval implications and primary actions visible. Orders, settings and issue editors already use dialogs; do not nest another popup unnecessarily.
