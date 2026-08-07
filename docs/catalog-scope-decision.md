# Catalog scope decision (2026-08-07)

The launch spec's target was "roughly 107 active cleaned products unless a
better justified final number is documented." This documents that decision.

## Final count: 36 active products

Not 107. Here's why, and why it's the right call for this stage.

## What's covered

- 9 core actions (Google Review, Yelp Review, Facebook Review, TripAdvisor
  Review, Rate Your Experience/Feedback, Follow Us on Social Media, Book
  Your Next Visit, View Our Menu, Visit Our Website), each in both pricing
  tiers (Standard Direct $39, Branded + QR Direct $49) = 18 products
- 8 additional review platforms (Cars.com, DealerRater, Healthgrades, Angi,
  BBB, Trustpilot, Zillow, Nextdoor), each in both tiers = 16 products
- Custom Direct Stand = 1 product
- Hosted Multi-Link Stand = 1 product

18 + 16 + 1 + 1 = 36.

Booking tools (Vagaro, Fresha, Booksy, Mindbody, Zocdoc, Calendly, Acuity,
Square Appointments, OpenTable, Resy) and form tools (Google Forms,
Jotform, SurveyMonkey, Typeform) are provider *options* under Book Your
Next Visit Stand and Rate Your Experience Stand respectively -- correctly
not counted as separate products, per the cleanup rule.

## Use case coverage (verified, not assumed)

Every one of the 10 use cases in src/data/use-cases.ts has real product
coverage, from a minimum of 2 (Front Desk & Reception, Hotels &
Hospitality) up to 18 (Restaurants & Cafés). No use case is empty or
token-covered by a single unrelated product.

## Why not push further to 107 right now

Getting there with the same quality bar would mean either:
1. Finding ~35 more genuinely distinct, legitimate, currently-active
   platforms -- realistically running into diminishing returns and niche/
   low-value territory well before 35 more exist
2. Adding real category taxonomy for generic utility actions (WiFi Access,
   Leave a Tip, Join Rewards, Get Directions) that don't fit any of the 7
   current catalog categories -- a genuine product-structure decision,
   deliberately deferred rather than rushed
3. Padding with low-value or redundant entries just to hit a number --
   explicitly the wrong move given the spec's own cleanup instructions

## What happens next

Per the business owner's direction: catalog expansion pauses here. More
products can be added later, after the system itself (admin editing,
storefront navigation, checkout) is fully built out on top of this
36-product foundation. The design-logic model, the branded-tier generator,
and the category structure are all in place and ready to support more
products being added later without further architecture work -- adding a
new platform going forward is a data-entry task, not a code change.
