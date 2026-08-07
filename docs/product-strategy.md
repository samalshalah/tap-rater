# Tap Rater Product Strategy

Tap Rater is a physical NFC/QR tabletop stand store first. The platform layer can support permanent device URLs, activation, business profiles, hosted pages, tracking, forms, and future customer dashboards, but the public launch storefront should sell only products Tap Rater can fulfill now.

## Current Launch Scope

Active storefront products:

- Google Review Stand
- Yelp Review Stand
- Facebook Review Stand
- TripAdvisor Review Stand
- Rate Your Experience Stand
- Follow Us on Social Media Stand
- Book Your Next Visit Stand
- View Our Menu Stand
- Visit Our Website Stand
- Custom Direct Stand

Flat plates, cards, employee name tags, badges, staff cards, bundles, and hosted multi-link subscription products are postponed.

## Purchase Model

Regular action stands are sold with two setup options:

- Standard Direct Stand: `$39` one-time. Ready-made printed stand art, one direct destination URL, no logo/name customization.
- Branded + QR Direct Stand: `$49` one-time. Customer business name plus QR, one direct destination URL. Logo is collected manually after checkout until durable storage is implemented.

Custom Direct Stand is sold as a separate product:

- Custom Direct Stand: `$49` one-time. Customer business name, custom headline or center graphic direction, CTA sentence, design notes, and one direct destination URL. Logo/design files are collected manually after checkout until durable storage is implemented.

Hosted Multi-Link is not public subscription checkout in this branch. It can be described as coming soon or request-only until recurring Stripe billing, hosted-page operations, and fulfillment rules are approved.

## Product Families

### Standard/Branded Direct Stands

These products use:

- `productType = physical_redirect`
- `serviceMode = basic_redirect`
- `checkoutMode = buy_now`
- `requiresAccount = false`
- `requiresLandingPage = false`
- `requiresSubscription = false`
- `activationType = free_basic_activation`
- `includedServiceLabel = Free basic activation`

### Custom Direct Stand

Custom Direct Stand uses managed setup:

- `productType = physical_managed`
- `serviceMode = managed_redirect`
- `checkoutMode = buy_now`
- `requiresAccount = false`
- `requiresLandingPage = false`
- `requiresSubscription = false`
- `activationType = managed_setup`
- `includedServiceLabel = Managed custom stand setup`

### Future Platform Products

Future hosted landing pages, multi-location dashboards, analytics subscriptions, and multi-link pages remain part of the long-term Tap Rater platform strategy. They should not be the default customer checkout path until live billing, support, and operations are approved.

Future platform products should use:

- `productType = platform_landing_page`
- `serviceMode = hosted_landing_page` or `multi_location_platform`
- `checkoutMode = request_quote` or `contact_sales`
- `requiresAccount = true`
- `requiresLandingPage = true`
- `requiresSubscription = true` only where hosted features require recurring service

## Storefront Categories

Categories are based on customer use case:

- Review Stands (`reviews`)
- Social Media Stands (`social-media`)
- Appointment & Reservation Stands (`appointments`)
- Menu & Info Stands (`menu`)
- Feedback Stands (`feedback`)
- Website & Link Stands (`website-links`)
- Custom Stands (`custom-stands`)

## Supported Destinations

The product model supports these destinations for current and future products:

- `google`
- `facebook`
- `yelp`
- `tripadvisor`
- `instagram`
- `tiktok`
- `booking`
- `website`
- `menu`
- `wifi`
- `feedback`
- `referral`
- `custom`

Launch customer copy should focus on the actual action: reviews, social, menu, booking, feedback, website, or one custom link.

## Compliance Language

Tap Rater must avoid review-gating language. Do not block unhappy customers from public review platforms. Do not imply unhappy customers are blocked from public review platforms. Do not say or imply that Tap Rater gets only positive reviews, filters negative reviews, asks only happy customers, rewards reviews, or prevents public review access.

Acceptable language focuses on reducing friction:

- "Tap or scan to open your review link."
- "Make it easier for customers to share their experience."
- "Open the right review, booking, social, menu, feedback, or business link."

## Checkout Direction

Stripe must remain sandbox/test mode until explicit approval. Current checkout can create one-time payment sessions for configured buy-now stands. Do not commit Stripe secrets, do not switch to live mode, and do not deploy live billing without approval.

## Launch Phases

### Phase 1: Physical Tabletop Stands

- Sell launch-ready tabletop NFC/QR stands.
- Keep postponed physical formats and hosted subscriptions out of the public checkout path.
- Collect destination URL and required branding details before checkout.
- For branded/custom orders, collect logo/design files manually after checkout and do not mark ready for print until final proof is approved.
- Create orders with enough setup detail for fulfillment review.

### Phase 2: Fulfillment and Admin Control

- Add durable logo upload/storage.
- Add admin product/category editing backed by the database.
- Add production proof and print-file review flows.
- Add fulfillment status and customer notification controls.

### Phase 3: Hosted Pages, Billing, and Subscriptions

- Add hosted multi-link pages after operations are ready.
- Add Stripe live checkout only after explicit approval, bank account readiness, tax/shipping decisions, and webhook verification.
- Add subscription plans only after pricing and cancellation/support workflows are approved.
