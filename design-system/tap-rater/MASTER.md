# Tap Rater Master Design System

This document records the current owner-approved Tap Rater design system as implemented in the Next.js storefront and admin app. It is descriptive, not a redesign proposal.

## Authority Order

1. Owner-approved Tap Rater design decisions
2. This Tap Rater master design system
3. Existing Tap Rater reusable components and tokens
4. UI UX Pro Max recommendations
5. Generic design recommendations

UI UX Pro Max is installed as a project-local UI/UX intelligence and QA skill. Its guidance may identify accessibility, responsiveness, interaction, hierarchy, and usability problems, but it must not automatically override approved Tap Rater visual decisions.

## Public Website Freeze

The current public website visual direction is approved. Do not use UI UX Pro Max to redesign the homepage, replace typography, replace brand colors, introduce glassmorphism, introduce a new visual style, change global radius, change established card language, alter CTA hierarchy, change product imagery style, restructure approved pages, or add unnecessary animation.

Allowed public-site work is limited to preserving the existing visual direction while fixing clear accessibility problems, responsive problems, inconsistent spacing, broken mobile behavior, interaction problems, and usability bugs.

## Stack

- Framework: Next.js App Router with React.
- Styling: Tailwind CSS plus global component classes in `src/app/globals.css`.
- Icons: `lucide-react`.
- Images: `next/image` on storefront; plain `img` appears in admin tables for thumbnails.
- Primary surfaces: Cloudflare/OpenNext public website, admin app, account pages, API routes.

## Brand Colors

The dominant implementation uses both Tailwind theme colors and CSS custom properties.

CSS variables:

- Ink: `#10201e`
- Muted: `#60706c`
- Line: `#d9e2df`
- Brand teal: `#0b7a75`
- Brand dark teal: `#064f4b`
- Accent amber: `#f5a524`
- Surface: `#ffffff`
- Page background: `#f5f5f7`
- Soft background: `#f6f8f7`
- Panel background: `#edf4f2`

Tailwind extensions:

- `ink`: `#111827`
- `muted`: `#5F6B76`
- `line`: `#DFE5E3`
- `brand`: `#0B7A75`
- `brand-dark`: `#075E59`
- `soft`: `#F7F8F6`
- `panel`: `#F2F6F5`
- `accent`: `#F5A524`

Dominant rule: use teal for brand actions and positive/ready states, amber for eyebrow/accent/warning context, ink for primary text and primary checkout/admin actions, white for cards, and soft gray/green for page sections and admin workspace surfaces.

## Backgrounds

- Site body background: `var(--tr-color-page)` / `#f5f5f7`.
- Public shell forces approved public sections to the page background while header and footer remain white.
- Storefront product grids use soft gray bands with white cards.
- Admin shell uses `bg-soft`; sidebar and table/card surfaces are white.

Avoid decorative gradient blobs, glass panels, heavy visual effects, and arbitrary color-theme changes.

## Typography

Global font stack:

`Aptos, "Segoe UI Variable", "Segoe UI", Inter, Arial, Helvetica, sans-serif`

The global stylesheet enforces this font family across all elements.

Dominant weights:

- Body: 400
- Standard labels/buttons/headings: 600
- Some older admin labels/buttons still use `font-bold` or `font-black`; treat 600 as the preferred approved pattern unless preserving an existing local page.

Global heading rules:

- `h1`: `clamp(2.15rem, 3.2vw, 3.2rem)`, weight 600, line-height 1.08
- `h2`: `clamp(1.75rem, 2.35vw, 2.45rem)`, weight 600, line-height 1.12
- `h3`: `clamp(1.15rem, 1.35vw, 1.45rem)`, weight 600, line-height 1.16
- Mobile `h1`: `clamp(2rem, 10vw, 2.65rem)`
- Mobile `h2`: `clamp(1.65rem, 7.5vw, 2.15rem)`

Named text classes:

- `.tr-eyebrow`: 11px/0.72rem uppercase, accent color, 0.06em letter spacing
- `.tr-hero-title`: large storefront title, weight 600, line-height 1.08
- `.tr-page-title`: page title, weight 600
- `.tr-section-title`: section title, weight 600
- `.tr-card-title`: compact card title
- `.tr-body`: base text, relaxed line-height, muted color
- `.tr-body-sm`: small body text
- `.tr-caption`: 12px supporting text

Text should wrap safely. The implementation uses `overflow-wrap: break-word` on main text and `overflow-wrap: anywhere` on major titles.

## Spacing And Layout

Dominant spacing rhythm is Tailwind's 4px scale, with common section gaps at 16, 20, 24, 32, 40, 48, and 64px.

Containers:

- `.tr-container`: max width 1440px, horizontal padding 16px mobile, 20px small screens, 40px desktop
- `.tr-container-wide`: same as `.tr-container`
- `.tr-container-narrow`: max width 3xl
- `.tr-admin-section`: max width 7xl, padding 16px mobile / 32px desktop, vertical padding around 24-48px

Storefront grids:

- Product cards use `aspect-[4/5]`, responsive 2-column at small width and 4-column at xl where appropriate.
- Filter sidebar uses white rounded panels and sticky positioning on desktop.

Admin grids:

- Summary metrics commonly use 4-column desktop grids.
- Admin list pages use a filter/search card above a horizontally scrollable table.
- Dense admin tables are acceptable when wrapped in `overflow-x-auto`.

## Borders, Radius, And Shadows

CSS variables:

- Small radius: `8px`
- Medium radius: `10px`
- Large radius: `24px`
- Extra large radius: `30px`
- Card shadow: `0 1px 2px rgba(16, 32, 30, 0.05)`
- Panel shadow: `0 16px 42px rgba(16, 32, 30, 0.08)`
- Hover shadow: `0 18px 44px rgba(16, 32, 30, 0.1)`

Tailwind extensions:

- `card`: `8px`
- `control`: `8px`
- `panel`: `12px`

Dominant implemented components:

- `.tr-card`: 20px radius, white, line border, light shadow
- `.tr-card-compact`: 18px radius, white, line border
- `.tr-hover-card`: 22px radius, subtle lift on hover
- `.tr-premium-surface`: 28px radius, larger soft shadow
- `.tr-process-step-card`: 28px radius
- `.tr-admin-card`: 14px radius, white, line border, light admin shadow
- `.tr-admin-table-shell`: 16px radius, white, line border, light admin shadow
- `.tr-admin-soft-panel`: 12px radius, `#f8f9fa`

Dominant rule: public storefront cards are softer and larger-radius; admin cards are tighter and more utilitarian.

## Buttons And Links

Shared classes:

- `.tr-button`: inline-flex, min-height 44px, gap 8px, rounded-lg, medium padding, 14px text, weight 600
- `.tr-button-primary`: ink fill, white text; hover changes to brand
- `.tr-button-secondary`: brand fill, white text; hover brand-dark
- `.tr-button-outline`: white fill, line border, ink text; hover brand border/text
- `.tr-button-ghost`: compact white outline button
- `.tr-icon-button`: 40x40 square icon button, line border, hover brand
- `.tr-editorial-link`: inline text link with brand color

Button text is allowed for clear commands. Icon buttons should use lucide icons and an accessible label. Avoid arbitrary per-page button styles unless preserving a local page that has not yet been normalized.

## Inputs, Selects, And Forms

Shared classes:

- `.tr-input`: full width, rounded-lg, line border, white background, 16px horizontal padding, 12px vertical padding, 14px text, focus border brand
- `.tr-textarea`: `.tr-input` plus minimum height and vertical resize
- `.tr-field-label`: grid gap 8px, 14px, weight 600

Observed admin form pattern:

- Labels wrap fields directly.
- Selects and inputs often use `rounded-md border border-line px-3 py-2 text-sm`.
- Status messages use inline text or colored panels.

Preferred rule for future admin improvements: keep fields compact, labeled, keyboard accessible, and validated server-side; add focused error summaries for complex forms when errors can affect multiple fields.

## Cards

Storefront product cards:

- `aspect-[4/5]`
- White surface
- Product image area takes about 1.3x the content area
- Rounded 22px compact / 28px default
- Subtle shadow and ring
- Image uses `object-contain`, center positioning, slight hover scale, and `mix-blend-multiply`
- Category/accent label above product name
- Product name close to price label

Action/marketing cards:

- White cards on soft page background
- Large radius and restrained shadow
- Short headings and muted supporting copy

Admin cards:

- White, line border, 12-16px radius, tighter padding
- Should prioritize scanability and operational density over decorative presentation

## Tables

Admin tables use:

- `.tr-admin-table-shell`
- Horizontal scrolling wrappers
- `min-w` table constraints for dense operational data
- Uppercase small headers in muted text
- 14px body text
- Row borders and subtle hover backgrounds
- Checkbox selection for bulk actions

UI UX Pro Max confirms the current horizontal-scroll pattern is acceptable for wide web tables. For high-use admin workflows, future improvements should consider mobile/card fallbacks or column prioritization rather than forcing all columns into phone width.

## Badges, Pills, Alerts

Shared pills:

- `.tr-pill`: inline-flex, rounded-full, uppercase 12px, weight 600
- `.tr-pill-neutral`: gray/soft neutral
- `.tr-pill-brand`: teal positive/brand

Observed admin statuses:

- Ready/direct/active: teal background with brand text
- Warning/pending: amber background with amber/ink text
- Archived/neutral: gray background with muted text
- Errors/blockers: red background with red text

Alerts:

- `.tr-status-success`: teal-tinted panel
- `.tr-status-warning`: amber-tinted panel
- `.tr-status-error`: red-tinted panel

Do not rely on color alone when the status meaning is important; include readable text.

## Modals

Current CSV import modal pattern:

- Full-screen fixed overlay
- Ink scrim at 50%
- Centered white panel
- Max width 2xl
- Rounded-lg
- Title, description, close button
- Dashed file drop area
- Explicit validate/apply action buttons
- Summary panel and inline errors

Future modal improvements should preserve this visual language while improving focus management, escape/overlay close behavior, and error-summary semantics where needed.

## Navigation

Public header:

- Sticky top header, z-index 30
- White surface with border and subtle backdrop blur
- Logo at left
- Desktop nav centered in rounded white nav container
- Account and cart actions at right
- Mobile menu uses a button with `aria-expanded`, `aria-controls`, and card-like menu links with short descriptions

Public footer:

- White surface, top border
- Multi-column link groups
- Muted intro copy and small copyright bar

Admin navigation:

- Left sidebar on desktop, horizontal scroll group navigation on smaller screens
- White sidebar with line border
- Lucide icons
- Active item uses ink fill and white text
- Group labels use uppercase muted text

## Responsive Behavior

Current patterns:

- Mobile-first Tailwind breakpoints.
- Storefront filters collapse into `details` on mobile and become sticky sidebar on desktop.
- Product grids move from one to two to four columns.
- Admin sidebar becomes horizontal scroll on non-desktop screens.
- Admin tables use horizontal scroll instead of squeezing columns.
- Containers use fixed responsive gutters.

Known constraint: admin is not yet fully mobile-optimized for repeated operations. Mobile admin should keep core actions usable, but dense workflows may remain desktop-first until intentionally redesigned.

## Accessibility Conventions

Existing conventions:

- Global visible focus ring on buttons, anchors, inputs, textareas, and selects.
- Decorative lucide icons often use `aria-hidden="true"`.
- Icon-only controls generally have `aria-label`.
- Mobile navigation exposes `aria-expanded` and `aria-controls`.
- Tables use checkbox labels for selection.
- Form controls have visible labels in most admin forms.

Future improvements should preserve these conventions and add:

- Focus trap and Escape handling for modal dialogs.
- Focusable error summaries for complex failed forms/imports.
- Better disabled-state explanation where actions are unavailable.
- Keyboard alternatives for any drag/drop-only interaction.
- Tests at 375px, 768px, 1024px, and 1440px for significant UI changes.

## Icon Conventions

- Use `lucide-react` for app and admin UI.
- Keep icon sizes compact and consistent: 14-16px in dense admin controls, 20-22px in header actions, 40px square hit areas for icon buttons.
- Icons beside visible text should be decorative unless they communicate additional state.
- Product/platform logos are media assets, not generic icons.

## Product Image Treatment

- Storefront cards show product images on white backgrounds with `object-contain`.
- Product images are centered, not cropped, and use subtle hover scale only.
- Product card aspect ratio is 4:5.
- Product media should reveal the actual stand/product clearly and avoid dark, blurred, or purely atmospheric treatment.
- Admin thumbnails are compact 64x64 white image boxes with borders and `object-contain`.

## Admin Primary Improvement Area

UI UX Pro Max may be used for focused QA and recommendations on:

- Admin Dashboard
- Products
- Product editor
- CSV Import modal
- Orders
- Order detail
- Production Queue
- Shipping
- Requests
- Email Templates
- Settings

Use focused searches for one concern at a time, such as responsive table, admin filters, accessible file upload, form error state, ecommerce order list, status badges, and modal focus. Do not regenerate this system for targeted work.

## Current Admin Inconsistencies

- Admin buttons are split between shared `.tr-button-*` classes and one-off `rounded-md ... font-black` classes.
- Admin cards vary between `.tr-admin-card`, `rounded-md border border-line bg-white shadow-sm`, and ad hoc panel styling.
- Badge typography alternates between `font-semibold`, `font-bold`, and `font-black`.
- Some admin pages use compact utilitarian spacing while others use larger marketing-like card grids.
- Products table remains information-dense; it uses horizontal scrolling but still carries many columns.
- Orders page has improved essential columns, but inline controls and quick actions may still crowd smaller viewports.
- CSV import modal lacks explicit focus trap/Escape behavior and does not move focus to an error summary after validation failure.
- Requests inbox uses cards while products/orders use tables; this may be appropriate by data type but should be documented per page if changed.

## Current Frontend UX Inconsistencies

- Public pages mix shared component classes with page-specific arbitrary color values like `#f7f8f8`, `#111317`, and `#5f686f`.
- Card radii vary from 20px to 30px on public surfaces; this is acceptable when tied to component type, but arbitrary new values should be avoided.
- Some hover states use lift, others only color/border changes.
- Mobile public navigation is strong, but long menu labels and cart count states should continue to be checked at narrow widths.
- Product image spacing and sizing has been tuned by page; keep the approved card aspect ratio and avoid per-card overrides unless a page rule requires it.

## UI UX Pro Max Guidance Adopted As QA Only

Focused searches returned these applicable rules:

- Wide web tables should use horizontal scroll or a card layout rather than breaking the viewport.
- Validation and async status messages should reserve stable space when they can shift nearby controls.
- Complex failed forms should include a focusable error summary plus inline field errors.
- Next.js mutations and API routes must validate and authorize server-side.

These are QA recommendations. They do not authorize a visual redesign.

## Tap Rater Rules That Override Generic Recommendations

- Do not introduce glassmorphism, decorative gradients, or a new visual style.
- Do not replace Aptos/Segoe typography.
- Do not replace teal/amber/ink brand color roles.
- Do not globally change border radius or card language.
- Do not make the public homepage or product pages look like a generic SaaS landing page.
- Do not add animation unless it supports an existing interaction and respects reduced motion.
- Do not replace product imagery style with stock, abstract, dark, blurred, or heavily cropped media.
- Do not add fake admin functionality for polish.

## Page Overrides

Use `design-system/tap-rater/pages/<page>.md` only when a major admin area intentionally needs rules that differ from this master system. Avoid page-specific systems unless the page has a real operational need.
