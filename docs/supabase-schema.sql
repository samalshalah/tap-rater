-- Tap Rater platform schema foundation.
-- Non-destructive: uses create table if not exists, create index if not exists,
-- and insert ... on conflict for demo rows.
-- Run in Supabase SQL editor after reviewing for your environment.

create extension if not exists pgcrypto;

-- Customers represent people who own or manage businesses and devices.
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  first_name text,
  last_name text,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.customers is 'People who own or manage Tap Rater businesses and devices.';
comment on column public.customers.email is 'Unique customer email used for account lookup and support.';

-- Businesses represent customer companies, stores, locations, or brands.
create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references public.customers(id) on delete set null,
  business_name text,
  logo_url text,
  website_url text,
  google_place_id text,
  google_review_url text,
  facebook_url text,
  yelp_url text,
  instagram_url text,
  booking_url text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint businesses_status_check check (status in ('active', 'inactive', 'archived'))
);

comment on table public.businesses is 'Business profiles connected to customers, destinations, devices, and landing pages.';
comment on column public.businesses.google_place_id is 'Google Place ID for server-side lookup and review URL support.';

-- Landing pages are hosted Tap Rater pages for premium/platform products.
create table if not exists public.landing_pages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references public.businesses(id) on delete cascade,
  template_type text not null,
  slug text unique,
  title text,
  headline text,
  description text,
  logo_url text,
  buttons_json jsonb not null default '[]'::jsonb,
  form_config_json jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint landing_pages_template_type_check check (
    template_type in (
      'multi_platform_review',
      'feedback_form',
      'referral_form',
      'appointment_booking',
      'social_links',
      'digital_business_card',
      'business_card',
      'wifi_menu',
      'custom_url'
    )
  ),
  constraint landing_pages_status_check check (status in ('draft', 'published', 'paused', 'archived'))
);

comment on table public.landing_pages is 'Hosted Tap Rater landing pages, forms, digital cards, and multi-platform review pages.';
comment on column public.landing_pages.buttons_json is 'JSON array for page buttons such as Google, Facebook, Yelp, menu, or booking links.';
comment on column public.landing_pages.form_config_json is 'JSON configuration for feedback, referral, and custom hosted forms.';

-- Devices represent physical NFC/QR products. Public scans use /r/{device_code}.
create table if not exists public.devices (
  id uuid primary key default gen_random_uuid(),
  device_code text unique not null,
  activation_code_hash text not null,
  product_type text not null,
  service_mode text not null,
  status text not null default 'unactivated',
  customer_id uuid references public.customers(id) on delete set null,
  business_id uuid references public.businesses(id) on delete set null,
  destination_type text,
  destination_url text,
  landing_page_id uuid references public.landing_pages(id) on delete set null,
  label text,
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint devices_product_type_check check (
    product_type in (
      'google_review',
      'facebook_review',
      'yelp_profile',
      'appointment_booking',
      'social_follow',
      'wifi_menu',
      'multi_platform_review',
      'feedback_form',
      'referral_form',
      'business_card',
      'custom_url'
    )
  ),
  constraint devices_service_mode_check check (
    service_mode in ('basic_redirect', 'managed_redirect', 'premium_landing_page')
  ),
  constraint devices_status_check check (
    status in ('unactivated', 'active', 'paused', 'lost', 'retired')
  ),
  constraint devices_destination_type_check check (
    destination_type is null or destination_type in (
      'google_review',
      'facebook_review',
      'yelp_profile',
      'booking',
      'social',
      'menu',
      'wifi',
      'custom',
      'landing_page'
    )
  )
);

comment on table public.devices is 'Physical Tap Rater NFC/QR devices resolved by public device_code.';
comment on column public.devices.device_code is 'Public code used in https://taprater.com/r/{deviceCode}.';
comment on column public.devices.activation_code_hash is 'Hash of the private activation code. Never store raw activation codes.';
comment on column public.devices.service_mode is 'basic_redirect, managed_redirect, or premium_landing_page.';

-- Tap events are lightweight analytics events for device scans and landing page views.
create table if not exists public.tap_events (
  id uuid primary key default gen_random_uuid(),
  device_id uuid references public.devices(id) on delete set null,
  business_id uuid references public.businesses(id) on delete set null,
  event_type text,
  destination_type text,
  ip_hash text,
  user_agent text,
  referrer text,
  created_at timestamptz not null default now(),
  constraint tap_events_event_type_check check (
    event_type is null or event_type in ('scan', 'redirect', 'landing_page_view', 'button_click', 'form_start', 'form_submit')
  ),
  constraint tap_events_destination_type_check check (
    destination_type is null or destination_type in (
      'google_review',
      'facebook_review',
      'yelp_profile',
      'booking',
      'social',
      'menu',
      'wifi',
      'custom',
      'landing_page'
    )
  )
);

comment on table public.tap_events is 'Analytics events for scans, redirects, landing page views, clicks, and form activity.';
comment on column public.tap_events.ip_hash is 'Hashed IP or coarse identifier. Avoid storing raw IP addresses unless required.';

-- Form submissions capture hosted feedback, referral, business card, or custom page forms.
create table if not exists public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  landing_page_id uuid references public.landing_pages(id) on delete set null,
  business_id uuid references public.businesses(id) on delete set null,
  device_id uuid references public.devices(id) on delete set null,
  name text,
  email text,
  phone text,
  message text,
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.form_submissions is 'Submissions from Tap Rater hosted landing pages and forms.';
comment on column public.form_submissions.payload_json is 'Flexible payload for feedback, referral, business card, or custom form fields.';

-- Device activation attempts are used for activation audit and abuse prevention.
create table if not exists public.device_activation_attempts (
  id uuid primary key default gen_random_uuid(),
  device_code text,
  email text,
  ip_hash text,
  success boolean,
  reason text,
  created_at timestamptz not null default now()
);

comment on table public.device_activation_attempts is 'Audit trail for device activation attempts and activation-code abuse prevention.';
comment on column public.device_activation_attempts.success is 'True when activation code verification succeeds.';
comment on column public.device_activation_attempts.reason is 'Short reason such as invalid_code, already_active, locked, or activated.';

-- Orders are created by Stripe test checkout and marked paid by Stripe webhooks.
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  stripe_checkout_session_id text unique not null,
  stripe_payment_intent_id text,
  status text not null default 'pending_payment',
  payment_status text,
  email text,
  customer_name text,
  subtotal_cents integer not null default 0,
  total_cents integer not null default 0,
  currency text not null default 'usd',
  line_items_json jsonb not null default '[]'::jsonb,
  customer_details_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_status_check check (
    status in ('pending_payment', 'paid', 'failed', 'canceled')
  ),
  constraint orders_subtotal_cents_check check (subtotal_cents >= 0),
  constraint orders_total_cents_check check (total_cents >= 0)
);

comment on table public.orders is 'Stripe Checkout order records. Test checkout creates pending orders and webhooks mark them paid.';
comment on column public.orders.stripe_checkout_session_id is 'Stripe Checkout Session ID used for idempotent webhook upserts.';
comment on column public.orders.line_items_json is 'Cart line items captured before redirecting to Stripe Checkout.';

-- Indexes for redirect lookup, admin filtering, and analytics queries.
create index if not exists idx_devices_device_code on public.devices(device_code);
create index if not exists idx_devices_business_id on public.devices(business_id);
create index if not exists idx_devices_customer_id on public.devices(customer_id);
create index if not exists idx_tap_events_device_id on public.tap_events(device_id);
create index if not exists idx_tap_events_business_id on public.tap_events(business_id);
create index if not exists idx_tap_events_created_at on public.tap_events(created_at);
create index if not exists idx_landing_pages_slug on public.landing_pages(slug);

-- Helpful supporting indexes for future admin screens.
create index if not exists idx_businesses_customer_id on public.businesses(customer_id);
create index if not exists idx_form_submissions_business_id on public.form_submissions(business_id);
create index if not exists idx_device_activation_attempts_device_code on public.device_activation_attempts(device_code);
create index if not exists idx_device_activation_attempts_created_at on public.device_activation_attempts(created_at);
create index if not exists idx_orders_status on public.orders(status);
create index if not exists idx_orders_created_at on public.orders(created_at desc);

-- Demo devices. Activation hashes are placeholders for local/demo setup only.
-- Replace with real hashed activation codes before manufacturing or production use.
insert into public.devices (
  device_code,
  activation_code_hash,
  product_type,
  service_mode,
  status,
  destination_type,
  destination_url,
  label
) values
  (
    'TR-DEMO-GOOGLE',
    'demo-hash-replace-before-production-google',
    'google_review',
    'basic_redirect',
    'unactivated',
    'google_review',
    null,
    'Demo Google Review Device'
  ),
  (
    'TR-DEMO-SOCIAL',
    'demo-hash-replace-before-production-social',
    'social_follow',
    'managed_redirect',
    'unactivated',
    'social',
    null,
    'Demo Social Follow Device'
  ),
  (
    'TR-DEMO-FEEDBACK',
    'demo-hash-replace-before-production-feedback',
    'feedback_form',
    'premium_landing_page',
    'unactivated',
    'landing_page',
    null,
    'Demo Feedback Form Device'
  )
on conflict (device_code) do nothing;
