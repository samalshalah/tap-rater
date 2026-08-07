# Phase 1 Products

Phase 1 sells physical tabletop NFC/QR stands only. Flat plates, cards, employee name tags, badges, staff cards, and hosted multi-link subscriptions are postponed until fulfillment and billing are approved.

## Active Storefront Products

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

## Purchase Options

Regular action stands support two customer-facing purchase options:

- Standard Direct Stand: `$39`, one-time, ready-made stand art with one direct NFC/QR destination.
- Branded + QR Direct Stand: `$49`, one-time, customer business name plus QR for one direct destination. Logo is collected manually after checkout before printing.

Custom Direct Stand is a separate product:

- Custom Direct Stand: `$49`, one-time, customer business name, custom headline or center direction, design notes, and one direct destination. Logo/design files are collected manually after checkout before printing.

Hosted Multi-Link is request-only/coming soon in this branch. Do not enable public subscription checkout until pricing, Stripe recurring billing, fulfillment, and hosted-page operations are approved.

## Shared Product Model

Active launch products use:

- `format = stand`
- `requiresAccount = false`
- `requiresLandingPage = false`
- `requiresSubscription = false`
- `checkoutMode = buy_now` while Stripe remains test mode
- `activationType = free_basic_activation` for regular action stands
- `activationType = managed_setup` for the Custom Direct Stand

Each product supports direct redirect activation. The physical NFC chip or QR code can point to a permanent Tap Rater URL, then redirect to one configured destination URL.

## Storefront Categories

Categories are based on customer use case:

- Review Stands (`reviews`)
- Social Media Stands (`social-media`)
- Appointment & Reservation Stands (`appointments`)
- Menu & Info Stands (`menu`)
- Feedback Stands (`feedback`)
- Website & Link Stands (`website-links`)
- Custom Stands (`custom-stands`)

## Product Copy Rules

- Physical products must say "No monthly fee required" where appropriate.
- Physical products must say "Connects to one destination URL."
- Physical products must say "Tap or scan ready."
- Do not mention flat plates in public launch paths.
- Branded/custom checkout must not pretend uploaded logo storage exists. If durable storage is not configured, admin orders must say logo/proof are pending manual collection.
- View Our Menu products are menu-only. Do not mention Wi-Fi in customer-facing menu product copy.
- Follow Us on Social Media products should mention common social destinations without promising unavailable integrations.
- Avoid review-gating language.
