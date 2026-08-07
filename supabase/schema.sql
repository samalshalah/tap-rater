create extension if not exists pgcrypto;

create table if not exists contact_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  message text not null,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create table if not exists setup_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  business_name text not null,
  review_url text not null,
  notes text not null default '',
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create table if not exists change_link_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  taprater_id text not null,
  new_review_url text not null,
  notes text not null default '',
  status text not null default 'new',
  created_at timestamptz not null default now()
);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  phone text,
  role text default 'customer',
  email_verified_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists businesses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete set null,
  business_name text not null,
  logo_url text,
  website_url text,
  phone text,
  address text,
  google_place_id text,
  google_review_url text,
  facebook_url text,
  yelp_url text,
  instagram_url text,
  booking_url text,
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists landing_pages (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses(id) on delete cascade,
  template_type text not null,
  slug text unique not null,
  title text,
  headline text,
  description text,
  logo_url text,
  buttons_json jsonb default '[]'::jsonb,
  form_config_json jsonb default '{}'::jsonb,
  status text default 'draft',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint landing_pages_status_check check (status in ('draft', 'published', 'paused'))
);

create table if not exists devices (
  id uuid primary key default gen_random_uuid(),
  device_code text unique not null,
  activation_code_hash text not null,
  product_type text not null,
  service_mode text not null,
  status text not null default 'unactivated',
  customer_id uuid references customers(id) on delete set null,
  business_id uuid references businesses(id) on delete set null,
  destination_type text,
  destination_url text,
  landing_page_id uuid references landing_pages(id) on delete set null,
  label text,
  activated_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint devices_status_check check (status in ('unactivated', 'active', 'paused', 'lost', 'retired')),
  constraint devices_service_mode_check check (service_mode in ('basic_redirect', 'managed_redirect', 'premium_landing_page')),
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

create table if not exists tap_events (
  id uuid primary key default gen_random_uuid(),
  device_id uuid references devices(id) on delete set null,
  business_id uuid references businesses(id) on delete set null,
  landing_page_id uuid references landing_pages(id) on delete set null,
  event_type text not null,
  destination_type text,
  ip_hash text,
  user_agent text,
  referrer text,
  created_at timestamptz default now()
);

create table if not exists form_submissions (
  id uuid primary key default gen_random_uuid(),
  landing_page_id uuid references landing_pages(id) on delete set null,
  business_id uuid references businesses(id) on delete set null,
  device_id uuid references devices(id) on delete set null,
  name text,
  email text,
  phone text,
  message text,
  payload_json jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists device_activation_attempts (
  id uuid primary key default gen_random_uuid(),
  device_code text not null,
  email text,
  ip_hash text,
  success boolean not null default false,
  reason text,
  created_at timestamptz default now()
);

create index if not exists customers_email_idx on customers(email);
create index if not exists businesses_customer_id_idx on businesses(customer_id);
create index if not exists businesses_google_place_id_idx on businesses(google_place_id);
create index if not exists devices_device_code_idx on devices(device_code);
create index if not exists devices_customer_id_idx on devices(customer_id);
create index if not exists devices_business_id_idx on devices(business_id);
create index if not exists devices_status_idx on devices(status);
create index if not exists landing_pages_slug_idx on landing_pages(slug);
create index if not exists landing_pages_business_id_idx on landing_pages(business_id);
create index if not exists tap_events_device_id_idx on tap_events(device_id);
create index if not exists tap_events_business_id_idx on tap_events(business_id);
create index if not exists tap_events_landing_page_id_idx on tap_events(landing_page_id);
create index if not exists tap_events_created_at_idx on tap_events(created_at desc);
create index if not exists device_activation_attempts_device_code_created_at_idx on device_activation_attempts(device_code, created_at desc);
create index if not exists device_activation_attempts_ip_hash_created_at_idx on device_activation_attempts(ip_hash, created_at desc);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  sku text not null unique,
  category_slug text not null,
  base_price_cents integer not null check (base_price_cents >= 0),
  sale_price_cents integer check (sale_price_cents >= 0),
  stock_status text not null check (stock_status in ('instock', 'outofstock')),
  short_description text not null default '',
  description text not null default '',
  product_type text not null default 'physical_redirect' check (product_type in ('physical_redirect', 'physical_managed', 'platform_landing_page', 'bundle')),
  service_mode text not null default 'basic_redirect' check (service_mode in ('basic_redirect', 'managed_redirect', 'hosted_landing_page', 'multi_location_platform')),
  checkout_mode text not null default 'buy_now' check (checkout_mode in ('buy_now', 'request_quote', 'subscription', 'contact_sales')),
  requires_account boolean not null default false,
  requires_subscription boolean not null default false,
  requires_landing_page boolean not null default false,
  supported_destinations text[] not null default array['custom']::text[],
  activation_type text not null default 'free_basic_activation' check (activation_type in ('free_basic_activation', 'managed_setup', 'premium_hosted_activation')),
  included_service_label text not null default 'Free basic activation',
  customization_options text[] not null default array['standard_design', 'add_logo', 'custom_design']::text[],
  allows_logo_upload boolean not null default true,
  allows_custom_design boolean not null default true,
  design_mode text not null default 'standard' check (design_mode in ('standard', 'logo', 'custom')),
  featured boolean not null default false,
  images jsonb not null default '[]'::jsonb,
  variants jsonb not null default '[]'::jsonb,
  seo_title text,
  seo_description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table products add column if not exists product_type text not null default 'physical_redirect' check (product_type in ('physical_redirect', 'physical_managed', 'platform_landing_page', 'bundle'));
alter table products add column if not exists service_mode text not null default 'basic_redirect';
alter table products add column if not exists checkout_mode text not null default 'buy_now' check (checkout_mode in ('buy_now', 'request_quote', 'subscription', 'contact_sales'));
alter table products add column if not exists requires_account boolean not null default false;
alter table products add column if not exists requires_subscription boolean not null default false;
alter table products add column if not exists requires_landing_page boolean not null default false;
alter table products add column if not exists supported_destinations text[] not null default array['custom']::text[];
alter table products add column if not exists activation_type text not null default 'free_basic_activation' check (activation_type in ('free_basic_activation', 'managed_setup', 'premium_hosted_activation'));
alter table products add column if not exists included_service_label text not null default 'Free basic activation';
alter table products add column if not exists customization_options text[] not null default array['standard_design', 'add_logo', 'custom_design']::text[];
alter table products add column if not exists allows_logo_upload boolean not null default true;
alter table products add column if not exists allows_custom_design boolean not null default true;
alter table products add column if not exists design_mode text not null default 'standard';
alter table products add column if not exists featured boolean not null default false;
alter table products add column if not exists images jsonb not null default '[]'::jsonb;
alter table products add column if not exists variants jsonb not null default '[]'::jsonb;

do $$
begin
  alter table products drop constraint if exists products_service_mode_check;
  update products set service_mode = 'hosted_landing_page' where service_mode = 'premium_landing_page';
  alter table products add constraint products_service_mode_check check (service_mode in ('basic_redirect', 'managed_redirect', 'hosted_landing_page', 'multi_location_platform'));
  alter table products drop constraint if exists products_supported_destinations_check;
  alter table products add constraint products_supported_destinations_check check (
    supported_destinations <@ array[
      'google',
      'facebook',
      'yelp',
      'tripadvisor',
      'instagram',
      'tiktok',
      'booking',
      'website',
      'menu',
      'wifi',
      'feedback',
      'referral',
      'custom'
    ]::text[]
  );
  alter table products drop constraint if exists products_customization_options_check;
  alter table products add constraint products_customization_options_check check (
    customization_options <@ array['standard_design', 'add_logo', 'custom_design']::text[]
  );
  alter table products drop constraint if exists products_design_mode_check;
  alter table products add constraint products_design_mode_check check (design_mode in ('standard', 'logo', 'custom'));
end $$;

update products
set product_type = 'bundle'
where slug in ('tap-rater-business-white-bundle', 'tap-rater-business-white-stands-bundle');

update products
set
  product_type = 'platform_landing_page',
  service_mode = 'hosted_landing_page',
  checkout_mode = 'subscription',
  requires_account = true,
  requires_subscription = true,
  requires_landing_page = true
where slug = 'tap-rater-white-stand-rate-your-experience';

create table if not exists product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  src text not null,
  alt text not null default '',
  sort_order integer not null default 0
);

create table if not exists product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  label text not null,
  sku text not null unique,
  stock_status text not null check (stock_status in ('instock', 'outofstock'))
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  stripe_checkout_session_id text not null unique,
  stripe_payment_intent_id text,
  status text not null default 'pending_payment' check (status in ('pending_payment', 'paid', 'failed', 'canceled')),
  payment_status text,
  email text,
  customer_name text,
  subtotal_cents integer not null default 0 check (subtotal_cents >= 0),
  total_cents integer not null default 0 check (total_cents >= 0),
  currency text not null default 'usd',
  line_items_json jsonb not null default '[]'::jsonb,
  customer_details_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_status_idx on orders(status);
create index if not exists orders_created_at_idx on orders(created_at desc);

create table if not exists site_content (
  key text primary key,
  type text not null check (type in ('homepage', 'page', 'section', 'redirect', 'seo')),
  status text not null default 'draft' check (status in ('draft', 'published')),
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists site_content_type_status_idx on site_content(type, status);

create table if not exists media_assets (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  src text not null,
  alt text not null default '',
  asset_type text not null default 'image',
  created_at timestamptz not null default now()
);
