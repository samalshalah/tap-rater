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
  password_hash text,
  account_status text not null default 'pending_activation',
  activation_token_hash text,
  activation_expires_at timestamptz,
  activated_at timestamptz,
  email_verified_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint customers_account_status_check check (account_status in ('pending_activation', 'active', 'disabled'))
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

create table if not exists auth_login_attempts (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('admin', 'customer')),
  identifier_hash text not null,
  ip_hash text,
  success boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists email_deliveries (
  id uuid primary key default gen_random_uuid(),
  message_type text not null,
  audience text not null,
  recipient text not null,
  subject text not null,
  status text not null default 'sending',
  provider_message_id text,
  idempotency_key text not null,
  failure_reason text,
  entity_type text,
  entity_id text,
  retryable boolean not null default false,
  attempt_number integer not null default 1,
  retry_of_id uuid references email_deliveries(id) on delete set null,
  accepted_at timestamptz,
  delivered_at timestamptz,
  last_event_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint email_deliveries_audience_check check (audience in ('customer', 'admin', 'internal', 'unknown')),
  constraint email_deliveries_status_check check (
    status in (
      'sending',
      'accepted',
      'delayed',
      'delivered',
      'failed',
      'bounced',
      'complained',
      'suppressed',
      'retrying',
      'retried'
    )
  ),
  constraint email_deliveries_attempt_number_check check (attempt_number between 1 and 5)
);

create index if not exists customers_email_idx on customers(email);
create index if not exists customers_activation_token_hash_idx
  on customers(activation_token_hash)
  where activation_token_hash is not null;
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
create index if not exists auth_login_attempts_identifier_created_at_idx on auth_login_attempts(scope, identifier_hash, created_at desc);
create index if not exists auth_login_attempts_ip_created_at_idx on auth_login_attempts(scope, ip_hash, created_at desc) where ip_hash is not null;
create index if not exists email_deliveries_created_at_idx on email_deliveries(created_at desc);
create index if not exists email_deliveries_status_created_at_idx on email_deliveries(status, created_at desc);
create index if not exists email_deliveries_provider_message_id_idx on email_deliveries(provider_message_id) where provider_message_id is not null;
create index if not exists email_deliveries_entity_idx on email_deliveries(entity_type, entity_id, created_at desc) where entity_id is not null;
create index if not exists email_deliveries_retry_of_id_idx on email_deliveries(retry_of_id) where retry_of_id is not null;

create table if not exists hosted_page_codes (
  code text primary key,
  physical_product_ref text not null unique,
  assigned_by text,
  assigned_at timestamptz not null default now(),
  retired_at timestamptz,
  constraint hosted_page_codes_code_check check (code ~ '^[A-HJKMNPQRSTVWXYZ2-9]{12}$')
);

create table if not exists hosted_page_snapshots (
  id uuid primary key default gen_random_uuid(),
  code text not null references hosted_page_codes(code) on delete restrict,
  version text not null,
  r2_key text not null unique,
  lifecycle_status text not null,
  published_at timestamptz not null default now(),
  is_current boolean not null default false,
  constraint hosted_page_snapshots_version_unique unique (code, version),
  constraint hosted_page_snapshots_lifecycle_status_check check (
    lifecycle_status in (
      'ACTIVE',
      'PAST_DUE',
      'CANCELLED_AT_PERIOD_END',
      'EXPIRED',
      'REACTIVATED',
      'RETIRED_INTERNAL'
    )
  )
);

create unique index if not exists hosted_page_snapshots_one_current_idx
  on hosted_page_snapshots(code)
  where is_current;

create table if not exists hosted_page_editor_pages (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete restrict,
  business_id uuid not null references businesses(id) on delete restrict,
  code text not null unique references hosted_page_codes(code) on delete restrict,
  lifecycle_status text not null default 'ACTIVE',
  draft_json jsonb not null default '{}'::jsonb,
  published_version text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hosted_page_editor_pages_code_check check (code ~ '^[A-HJKMNPQRSTVWXYZ2-9]{12}$'),
  constraint hosted_page_editor_pages_lifecycle_status_check check (
    lifecycle_status in (
      'ACTIVE',
      'PAST_DUE',
      'CANCELLED_AT_PERIOD_END',
      'EXPIRED',
      'REACTIVATED',
      'RETIRED_INTERNAL'
    )
  )
);

create index if not exists hosted_page_editor_pages_customer_id_idx
  on hosted_page_editor_pages(customer_id);

create index if not exists hosted_page_editor_pages_business_id_idx
  on hosted_page_editor_pages(business_id);

create table if not exists stripe_events (
  id text primary key,
  type text not null,
  processed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  sku text not null unique,
  category_slug text not null,
  stand_type_slug text,
  primary_platform_slug text,
  destination_type text,
  is_special_solution boolean not null default false,
  product_kind text not null default 'normal_direct' check (product_kind in ('normal_direct', 'custom_direct', 'bundle')),
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  sort_order integer not null default 1000,
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
  supports_multilink boolean not null default false,
  supported_destinations text[] not null default array['custom']::text[],
  activation_type text not null default 'free_basic_activation' check (activation_type in ('free_basic_activation', 'managed_setup', 'premium_hosted_activation')),
  included_service_label text not null default 'Free basic activation',
  format text not null default 'stand' check (format in ('stand', 'plate', 'bundle', 'platform')),
  customization_options text[] not null default array['standard_design', 'add_logo']::text[],
  allows_logo_upload boolean not null default true,
  allows_custom_design boolean not null default false,
  design_mode text not null default 'standard' check (design_mode in ('standard', 'logo', 'custom')),
  images jsonb not null default '[]'::jsonb,
  standard_angled_image_url text,
  branded_angled_image_url text,
  multilink_angled_image_url text,
  standard_front_template_url text,
  branded_front_template_url text,
  multilink_front_template_url text,
  center_asset_url text,
  default_cta_text text,
  cta_editable boolean not null default false,
  landing_page_preview_config jsonb not null default '{}'::jsonb,
  asset_readiness_status text not null default 'draft_missing_assets' check (asset_readiness_status in ('draft_missing_assets', 'ready', 'blocked')),
  seo_title text,
  seo_description text,
  search_keywords text[] not null default '{}',
  size_options jsonb not null default '[]'::jsonb,
  color_options jsonb not null default '[]'::jsonb,
  key_features jsonb not null default '[]'::jsonb,
  how_it_works jsonb not null default '[]'::jsonb,
  specifications jsonb not null default '[]'::jsonb,
  included_items jsonb not null default '[]'::jsonb,
  product_faqs jsonb not null default '[]'::jsonb,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table products add column if not exists product_type text not null default 'physical_redirect' check (product_type in ('physical_redirect', 'physical_managed', 'platform_landing_page', 'bundle'));
alter table products add column if not exists stand_type_slug text;
alter table products add column if not exists primary_platform_slug text;
alter table products add column if not exists destination_type text;
alter table products add column if not exists is_special_solution boolean not null default false;
alter table products add column if not exists product_kind text not null default 'normal_direct';
alter table products add column if not exists status text not null default 'draft';
alter table products add column if not exists sort_order integer not null default 1000;
alter table products add column if not exists service_mode text not null default 'basic_redirect';
alter table products add column if not exists checkout_mode text not null default 'buy_now' check (checkout_mode in ('buy_now', 'request_quote', 'subscription', 'contact_sales'));
alter table products add column if not exists requires_account boolean not null default false;
alter table products add column if not exists requires_subscription boolean not null default false;
alter table products add column if not exists requires_landing_page boolean not null default false;
alter table products add column if not exists supports_multilink boolean not null default false;
alter table products add column if not exists supported_destinations text[] not null default array['custom']::text[];
alter table products add column if not exists activation_type text not null default 'free_basic_activation' check (activation_type in ('free_basic_activation', 'managed_setup', 'premium_hosted_activation'));
alter table products add column if not exists included_service_label text not null default 'Free basic activation';
alter table products add column if not exists format text not null default 'stand';
alter table products add column if not exists customization_options text[] not null default array['standard_design', 'add_logo']::text[];
alter table products add column if not exists allows_logo_upload boolean not null default true;
alter table products add column if not exists allows_custom_design boolean not null default false;
alter table products add column if not exists design_mode text not null default 'standard';
alter table products add column if not exists display_text text;
alter table products add column if not exists images jsonb not null default '[]'::jsonb;
alter table products add column if not exists standard_angled_image_url text;
alter table products add column if not exists branded_angled_image_url text;
alter table products add column if not exists multilink_angled_image_url text;
alter table products add column if not exists standard_front_template_url text;
alter table products add column if not exists branded_front_template_url text;
alter table products add column if not exists multilink_front_template_url text;
alter table products add column if not exists center_asset_url text;
alter table products add column if not exists default_cta_text text;
alter table products add column if not exists cta_editable boolean not null default false;
alter table products add column if not exists landing_page_preview_config jsonb not null default '{}'::jsonb;
alter table products add column if not exists asset_readiness_status text not null default 'draft_missing_assets';
alter table products add column if not exists search_keywords text[] not null default '{}';
alter table products add column if not exists size_options jsonb not null default '[]'::jsonb;
alter table products add column if not exists color_options jsonb not null default '[]'::jsonb;
alter table products add column if not exists key_features jsonb not null default '[]'::jsonb;
alter table products add column if not exists how_it_works jsonb not null default '[]'::jsonb;
alter table products add column if not exists specifications jsonb not null default '[]'::jsonb;
alter table products add column if not exists included_items jsonb not null default '[]'::jsonb;
alter table products add column if not exists product_faqs jsonb not null default '[]'::jsonb;
alter table products alter column is_active set default false;

do $$
begin
  alter table products drop constraint if exists products_service_mode_check;
  alter table products drop constraint if exists products_format_check;
  alter table products drop constraint if exists products_product_kind_check;
  alter table products drop constraint if exists products_status_check;
  alter table products drop constraint if exists products_asset_readiness_status_check;
  alter table products drop constraint if exists products_destination_type_check;
  update products set service_mode = 'hosted_landing_page' where service_mode = 'premium_landing_page';
  alter table products add constraint products_service_mode_check check (service_mode in ('basic_redirect', 'managed_redirect', 'hosted_landing_page', 'multi_location_platform'));
  alter table products add constraint products_format_check check (format in ('stand', 'plate', 'bundle', 'platform'));
  alter table products add constraint products_product_kind_check check (product_kind in ('normal_direct', 'custom_direct', 'bundle'));
  alter table products add constraint products_status_check check (status in ('draft', 'active', 'archived'));
  alter table products add constraint products_asset_readiness_status_check check (asset_readiness_status in ('draft_missing_assets', 'ready', 'blocked'));
  alter table products add constraint products_destination_type_check check (
    destination_type is null or destination_type in (
      'review',
      'review_social',
      'booking',
      'menu',
      'menu_order',
      'order',
      'reservation',
      'website',
      'social',
      'payment',
      'loyalty',
      'custom'
    )
  );
  alter table products drop constraint if exists products_supported_destinations_check;
  alter table products add constraint products_supported_destinations_check check (
    supported_destinations <@ array[
      'google',
      'facebook',
      'yelp',
      'tripadvisor',
      'trustpilot',
      'bbb',
      'nextdoor',
      'avvo',
      'taskrabbit',
      'martindale',
      'justia',
      'findlaw',
      'lawyers',
      'zillow',
      'realtor',
      'homes',
      'apartments',
      'trulia',
      'dealerrater',
      'autotrader',
      'carfax',
      'edmunds',
      'cars',
      'cargurus',
      'repairpal',
      'surecritic',
      'homeadvisor',
      'thumbtack',
      'houzz',
      'porch',
      'instagram',
      'tiktok',
      'linkedin',
      'x',
      'youtube',
      'snapchat',
      'pinterest',
      'whatsapp',
      'telegram',
      'airbnb',
      'agoda',
      'vrbo',
      'hotels',
      'healthgrades',
      'vitals',
      'ratemds',
      'caredash',
      'opencare',
      'styleseat',
      'vagaro',
      'booksy',
      'fresha',
      'zocdoc',
      'calendly',
      'acuity',
      'square-appointments',
      'custom-booking-url',
      'booking',
      'toast',
      'doordash',
      'ubereats',
      'grubhub',
      'opentable',
      'resy',
      'custom-menu-url',
      'website',
      'menu',
      'wifi',
      'feedback',
      'referral',
      'payment-url',
      'loyalty-url',
      'custom-url',
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

create table if not exists stand_types (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  short_description text not null default '',
  long_content text not null default '',
  buyer_intent text not null default '',
  seo_title text,
  seo_description text,
  image_url text,
  banner_image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists business_uses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  short_description text not null default '',
  long_content text not null default '',
  seo_title text,
  seo_description text,
  image_url text,
  banner_image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table business_uses
  add column if not exists short_description text not null default '',
  add column if not exists long_content text not null default '',
  add column if not exists seo_title text,
  add column if not exists seo_description text,
  add column if not exists banner_image_url text;

alter table stand_types
  add column if not exists short_description text not null default '',
  add column if not exists long_content text not null default '',
  add column if not exists buyer_intent text not null default '',
  add column if not exists seo_title text,
  add column if not exists seo_description text,
  add column if not exists banner_image_url text;

create table if not exists platforms (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  destination_type text not null,
  icon_url text,
  google_places_enabled boolean not null default false,
  manual_url_allowed boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists product_business_uses (
  product_slug text not null references products(slug) on delete cascade,
  business_use_slug text not null references business_uses(slug) on delete restrict,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (product_slug, business_use_slug)
);

create table if not exists product_options (
  id uuid primary key default gen_random_uuid(),
  product_slug text not null references products(slug) on delete cascade,
  option_code text not null check (option_code in ('standard_direct', 'branded_qr_direct', 'hosted_multilink')),
  title text not null,
  description text not null default '',
  price_cents integer not null check (price_cents >= 0),
  monthly_price_cents integer check (monthly_price_cents >= 0),
  max_links integer check (max_links is null or max_links > 0),
  requires_destination_url boolean not null default true,
  has_qr boolean not null default false,
  requires_logo boolean not null default false,
  requires_business_name boolean not null default false,
  requires_design_step boolean not null default false,
  requires_front_proof boolean not null default false,
  requires_subscription boolean not null default false,
  account_required boolean not null default false,
  supports_reorderable_links boolean not null default false,
  supports_link_visibility boolean not null default false,
  landing_page_url_pattern text,
  footer_label text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_slug, option_code)
);

create table if not exists product_option_templates (
  option_code text primary key check (option_code in ('standard_direct', 'branded_qr_direct', 'hosted_multilink')),
  title text not null,
  description text not null default '',
  price_cents integer not null check (price_cents >= 0),
  monthly_price_cents integer check (monthly_price_cents >= 0),
  max_links integer check (max_links is null or max_links > 0),
  requires_destination_url boolean not null default true,
  has_qr boolean not null default false,
  requires_logo boolean not null default false,
  requires_business_name boolean not null default false,
  requires_design_step boolean not null default false,
  requires_front_proof boolean not null default false,
  requires_subscription boolean not null default false,
  account_required boolean not null default false,
  supports_reorderable_links boolean not null default false,
  supports_link_visibility boolean not null default false,
  landing_page_url_pattern text,
  footer_label text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table product_options add column if not exists max_links integer;
alter table product_options add column if not exists supports_reorderable_links boolean not null default false;
alter table product_options add column if not exists supports_link_visibility boolean not null default false;
alter table product_options add column if not exists landing_page_url_pattern text;
alter table product_options add column if not exists footer_label text;
alter table product_options drop constraint if exists product_options_option_code_check;
alter table product_options add constraint product_options_option_code_check check (option_code in ('standard_direct', 'branded_qr_direct', 'hosted_multilink'));
alter table product_options drop constraint if exists product_options_max_links_check;
alter table product_options add constraint product_options_max_links_check check (max_links is null or max_links > 0);

alter table product_option_templates add column if not exists max_links integer;
alter table product_option_templates add column if not exists supports_reorderable_links boolean not null default false;
alter table product_option_templates add column if not exists supports_link_visibility boolean not null default false;
alter table product_option_templates add column if not exists landing_page_url_pattern text;
alter table product_option_templates add column if not exists footer_label text;
alter table product_option_templates drop constraint if exists product_option_templates_option_code_check;
alter table product_option_templates add constraint product_option_templates_option_code_check check (option_code in ('standard_direct', 'branded_qr_direct', 'hosted_multilink'));
alter table product_option_templates drop constraint if exists product_option_templates_max_links_check;
alter table product_option_templates add constraint product_option_templates_max_links_check check (max_links is null or max_links > 0);

create table if not exists service_addons (
  code text primary key,
  title text not null,
  monthly_price_cents integer not null check (monthly_price_cents >= 0),
  requires_account boolean not null default false,
  requires_hosted_page boolean not null default false,
  max_links integer check (max_links is null or max_links > 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists product_service_addons (
  product_slug text not null references products(slug) on delete cascade,
  service_addon_code text not null references service_addons(code) on delete cascade,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (product_slug, service_addon_code)
);

alter table products drop constraint if exists products_stand_type_slug_fkey;
alter table products
  add constraint products_stand_type_slug_fkey
  foreign key (stand_type_slug) references stand_types(slug) on delete restrict
  not valid;

alter table products drop constraint if exists products_primary_platform_slug_fkey;
alter table products
  add constraint products_primary_platform_slug_fkey
  foreign key (primary_platform_slug) references platforms(slug) on delete restrict
  not valid;

create index if not exists stand_types_active_sort_idx on stand_types(is_active, sort_order, title);
create index if not exists business_uses_active_sort_idx on business_uses(is_active, sort_order, title);
create index if not exists business_uses_public_sort_idx on business_uses(is_active, sort_order, title);
create index if not exists stand_types_public_sort_idx on stand_types(is_active, sort_order, title);
create index if not exists platforms_active_destination_sort_idx on platforms(is_active, destination_type, title);
create index if not exists product_business_uses_business_use_idx on product_business_uses(business_use_slug);
create index if not exists product_options_product_active_sort_idx on product_options(product_slug, is_active, sort_order);
create index if not exists products_stand_type_idx on products(stand_type_slug);
create index if not exists products_primary_platform_idx on products(primary_platform_slug);
create index if not exists products_status_idx on products(status);
create index if not exists products_active_sort_idx on products(is_active, sort_order, title);

insert into stand_types (slug, title, description, image_url, sort_order, is_active)
values
  ('review-stands', 'Review Stands', 'Stands that send customers to a review destination.', '/uploads/products/google-review-stand.png', 10, true),
  ('social-media-stands', 'Social Media Stands', 'Stands that open social profiles or follow links.', '/uploads/products/social-media-stand.png', 20, true),
  ('appointment-reservation-stands', 'Appointment & Reservation Stands', 'Stands that open booking, scheduling, reservation, or service links.', '/uploads/products/book-next-visit-stand.png', 30, true),
  ('feedback-survey-stands', 'Feedback & Survey Stands', 'Stands that collect private feedback or survey responses.', '/uploads/products/rate-your-experience-stand.png', 40, true),
  ('menu-info-stands', 'Menu & Info Stands', 'Stands that open menus, services, pricing, or information pages.', '/uploads/products/view-menu-stand.png', 50, true),
  ('website-link-stands', 'Website & Link Stands', 'Stands that open one website, link hub, information page, or custom URL.', '/uploads/products/visit-website-stand.png', 60, true),
  ('payment-tip-donation-stands', 'Payment, Tip & Donation Stands', 'Stands that open payment, tip, donation, or support links.', '/uploads/products/no-photo-available.png', 70, true),
  ('loyalty-rewards-stands', 'Loyalty & Rewards Stands', 'Stands that open loyalty, rewards, signup, or membership destinations.', '/uploads/products/no-photo-available.png', 80, true),
  ('custom-stands', 'Custom Stands', 'Custom Tap Rater stand products and special printed solutions.', '/uploads/products/business-google-white-stands-bundle.jpg', 90, true)
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  image_url = excluded.image_url,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  updated_at = now();

insert into business_uses (slug, title, description, image_url, sort_order, is_active)
values
  ('automotive', 'Automotive', 'Dealership, service, repair, and automotive customer actions.', '/uploads/use-cases/auto-dealerships.webp', 10, true),
  ('restaurant-food', 'Restaurant / Food', 'Restaurants, cafes, food trucks, delivery, menus, reservations, and feedback.', '/uploads/use-cases/restaurants-cafes.webp', 20, true),
  ('hotel-travel', 'Hotel / Travel', 'Hotels, hospitality, travel, guest information, and travel reviews.', '/uploads/use-cases/hotels-hospitality.webp', 30, true),
  ('healthcare-dental', 'Healthcare / Dental', 'Medical, dental, patient appointment, review, and feedback use cases.', '/uploads/use-cases/healthcare-dental.webp', 40, true),
  ('home-services', 'Home Services', 'Contractor, service appointment, quote, and review use cases.', '/uploads/use-cases/home-services.webp', 50, true),
  ('legal', 'Legal', 'Law firm consultation, contact, review, and website use cases.', '/uploads/use-cases/legal-services.webp', 60, true),
  ('real-estate', 'Real Estate', 'Listings, open houses, tours, contact, and review use cases.', '/uploads/use-cases/real-estate.webp', 70, true),
  ('beauty-salon-wellness', 'Beauty / Salon / Wellness', 'Salon, spa, wellness booking, service, review, and social use cases.', '/uploads/use-cases/beauty-wellness.webp', 80, true),
  ('ecommerce-online-brand', 'Ecommerce / Online Brand', 'Online store, catalog, review, promotion, and app use cases.', '/uploads/use-cases/ecommerce-brands.webp', 90, true),
  ('retail-local-business', 'Retail / Local Business', 'Local retail, grocery, website, offer, review, and social use cases.', '/uploads/use-cases/retail-grocery.webp', 100, true)
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  image_url = excluded.image_url,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  updated_at = now();

insert into platforms (slug, title, destination_type, icon_url, google_places_enabled, manual_url_allowed, is_active)
values
  ('google', 'Google', 'review', null, true, true, true),
  ('yelp', 'Yelp', 'review', null, false, true, true),
  ('facebook', 'Facebook', 'review_social', null, false, true, true),
  ('tripadvisor', 'Tripadvisor', 'review', null, false, true, true),
  ('trustpilot', 'Trustpilot', 'review', null, false, true, true),
  ('bbb', 'BBB', 'review', null, false, true, true),
  ('nextdoor', 'Nextdoor', 'review', null, false, true, true),
  ('avvo', 'Avvo', 'review', null, false, true, true),
  ('taskrabbit', 'Taskrabbit', 'review', null, false, true, true),
  ('martindale', 'Martindale', 'review', null, false, true, true),
  ('justia', 'Justia', 'review', null, false, true, true),
  ('findlaw', 'FindLaw', 'review', null, false, true, true),
  ('lawyers', 'Lawyers.com', 'review', null, false, true, true),
  ('zillow', 'Zillow', 'review', null, false, true, true),
  ('realtor', 'Realtor.com', 'review', null, false, true, true),
  ('homes', 'Homes.com', 'review', null, false, true, true),
  ('apartments', 'Apartments.com', 'review', null, false, true, true),
  ('trulia', 'Trulia', 'review', null, false, true, true),
  ('dealerrater', 'DealerRater', 'review', null, false, true, true),
  ('autotrader', 'Autotrader', 'review', null, false, true, true),
  ('carfax', 'CARFAX', 'review', null, false, true, true),
  ('edmunds', 'Edmunds', 'review', null, false, true, true),
  ('cars', 'Cars.com', 'review', null, false, true, true),
  ('cargurus', 'CarGurus', 'review', null, false, true, true),
  ('repairpal', 'RepairPal', 'review', null, false, true, true),
  ('surecritic', 'SureCritic', 'review', null, false, true, true),
  ('homeadvisor', 'HomeAdvisor', 'review', null, false, true, true),
  ('thumbtack', 'Thumbtack', 'review', null, false, true, true),
  ('houzz', 'Houzz', 'review', null, false, true, true),
  ('porch', 'Porch', 'review', null, false, true, true),
  ('caredash', 'CareDash', 'review', null, false, true, true),
  ('opencare', 'Opencare', 'review', null, false, true, true),
  ('styleseat', 'StyleSeat', 'review', null, false, true, true),
  ('angi', 'Angi', 'review', null, false, true, true),
  ('airbnb', 'Airbnb', 'review', null, false, true, true),
  ('agoda', 'Agoda', 'review', null, false, true, true),
  ('vrbo', 'Vrbo', 'review', null, false, true, true),
  ('hotels', 'Hotels.com', 'review', null, false, true, true),
  ('healthgrades', 'Healthgrades', 'review', null, false, true, true),
  ('vitals', 'Vitals', 'review', null, false, true, true),
  ('ratemds', 'RateMDs', 'review', null, false, true, true),
  ('vagaro', 'Vagaro', 'booking', null, false, true, true),
  ('booksy', 'Booksy', 'booking', null, false, true, true),
  ('fresha', 'Fresha', 'booking', null, false, true, true),
  ('zocdoc', 'Zocdoc', 'booking', null, false, true, true),
  ('calendly', 'Calendly', 'booking', null, false, true, true),
  ('acuity', 'Acuity Scheduling', 'booking', null, false, true, true),
  ('square-appointments', 'Square Appointments', 'booking', null, false, true, true),
  ('custom-booking-url', 'Custom Booking URL', 'booking', null, false, true, true),
  ('toast', 'Toast', 'menu_order', null, false, true, true),
  ('doordash', 'DoorDash', 'order', null, false, true, true),
  ('ubereats', 'Uber Eats', 'order', null, false, true, true),
  ('grubhub', 'Grubhub', 'order', null, false, true, true),
  ('opentable', 'OpenTable', 'reservation', null, false, true, true),
  ('resy', 'Resy', 'reservation', null, false, true, true),
  ('custom-menu-url', 'Custom Menu URL', 'menu', null, false, true, true),
  ('website', 'Website', 'website', null, false, true, true),
  ('instagram', 'Instagram', 'social', null, false, true, true),
  ('tiktok', 'TikTok', 'social', null, false, true, true),
  ('linkedin', 'LinkedIn', 'social', null, false, true, true),
  ('x', 'X', 'social', null, false, true, true),
  ('youtube', 'YouTube', 'social', null, false, true, true),
  ('snapchat', 'Snapchat', 'social', null, false, true, true),
  ('pinterest', 'Pinterest', 'social', null, false, true, true),
  ('whatsapp', 'WhatsApp', 'social', null, false, true, true),
  ('telegram', 'Telegram', 'social', null, false, true, true),
  ('payment-url', 'Payment URL', 'payment', null, false, true, true),
  ('loyalty-url', 'Loyalty URL', 'loyalty', null, false, true, true),
  ('custom-url', 'Custom URL', 'custom', null, false, true, true)
on conflict (slug) do update set
  title = excluded.title,
  destination_type = excluded.destination_type,
  icon_url = excluded.icon_url,
  google_places_enabled = excluded.google_places_enabled,
  manual_url_allowed = excluded.manual_url_allowed,
  is_active = excluded.is_active,
  updated_at = now();

insert into product_option_templates (
  option_code,
  title,
  description,
  price_cents,
  monthly_price_cents,
  max_links,
  requires_destination_url,
  has_qr,
  requires_logo,
  requires_business_name,
  requires_design_step,
  requires_front_proof,
  requires_subscription,
  account_required,
  supports_reorderable_links,
  supports_link_visibility,
  landing_page_url_pattern,
  footer_label,
  sort_order,
  is_active
)
values
  ('standard_direct', 'Standard Direct', 'Ready-made direct stand with NFC only and one required destination link.', 3900, null, null, true, false, false, false, false, false, false, false, false, false, null, null, 10, true),
  ('branded_qr_direct', 'Branded + QR Direct', 'Branded direct stand with NFC, printed QR, business name, logo collection, and front proof.', 4900, null, null, true, true, true, true, true, true, false, false, false, false, null, null, 20, true),
  ('hosted_multilink', 'Multi-Link', 'Recurring hosted service add-on for a compatible physical stand.', 0, 999, 10, false, true, true, true, true, true, true, true, true, true, 'https://taprater.com/p/{code}', 'Powered by Tap Rater', 30, true)
on conflict (option_code) do update set
  title = excluded.title,
  description = excluded.description,
  price_cents = excluded.price_cents,
  monthly_price_cents = excluded.monthly_price_cents,
  max_links = excluded.max_links,
  requires_destination_url = excluded.requires_destination_url,
  has_qr = excluded.has_qr,
  requires_logo = excluded.requires_logo,
  requires_business_name = excluded.requires_business_name,
  requires_design_step = excluded.requires_design_step,
  requires_front_proof = excluded.requires_front_proof,
  requires_subscription = excluded.requires_subscription,
  account_required = excluded.account_required,
  supports_reorderable_links = excluded.supports_reorderable_links,
  supports_link_visibility = excluded.supports_link_visibility,
  landing_page_url_pattern = excluded.landing_page_url_pattern,
  footer_label = excluded.footer_label,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  updated_at = now();

insert into service_addons (code, title, monthly_price_cents, requires_account, requires_hosted_page, max_links, active)
values ('hosted_multilink', 'Multi-Link', 999, true, true, 10, true)
on conflict (code) do update set
  title = excluded.title,
  monthly_price_cents = excluded.monthly_price_cents,
  requires_account = excluded.requires_account,
  requires_hosted_page = excluded.requires_hosted_page,
  max_links = excluded.max_links,
  active = excluded.active,
  updated_at = now();

insert into product_service_addons (product_slug, service_addon_code, enabled)
select product_slug, 'hosted_multilink', true
from (
  values
    ('follow-us-social-media-stand'),
    ('rate-your-experience-stand'),
    ('visit-our-website-stand'),
    ('custom-direct-stand')
) as compatible_products(product_slug)
where exists (select 1 from products where slug = compatible_products.product_slug)
on conflict (product_slug, service_addon_code) do update set
  enabled = excluded.enabled,
  updated_at = now();

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
  stripe_refund_id text,
  refunded_at timestamptz,
  status text not null default 'pending_payment' check (status in ('pending_payment', 'paid', 'failed', 'canceled')),
  payment_status text,
  email text,
  customer_name text,
  subtotal_cents integer not null default 0 check (subtotal_cents >= 0),
  total_cents integer not null default 0 check (total_cents >= 0),
  currency text not null default 'usd',
  line_items_json jsonb not null default '[]'::jsonb,
  customer_details_json jsonb,
  shipping_address_json jsonb,
  shipping_amount_cents integer not null default 0,
  shipping_mode text,
  production_status text not null default 'not_started',
  shipping_status text not null default 'not_shipped',
  shipping_method text,
  shipping_carrier text,
  tracking_number text,
  tracking_url text,
  shipped_at timestamptz,
  internal_notes text not null default '',
  admin_fulfillment_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_status_idx on orders(status);
create index if not exists orders_created_at_idx on orders(created_at desc);
create index if not exists orders_fulfillment_queue_idx on orders(status, production_status, shipping_status, created_at desc);

create table if not exists hosted_subscriptions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete restrict,
  business_id uuid not null references businesses(id) on delete restrict,
  hosted_page_id uuid not null references hosted_page_editor_pages(id) on delete restrict,
  order_id uuid references orders(id) on delete set null,
  stripe_checkout_session_id text not null unique,
  stripe_customer_id text,
  stripe_subscription_id text not null,
  permanent_code text not null unique references hosted_page_codes(code) on delete restrict,
  hosted_page_url text not null,
  status text not null default 'unknown',
  lifecycle_status text not null default 'ACTIVE',
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  past_due_since timestamptz,
  grace_ends_at timestamptz,
  provisioning_status text not null default 'ready_for_customer_setup',
  provisioning_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint hosted_subscriptions_permanent_code_check check (permanent_code ~ '^[A-HJKMNPQRSTVWXYZ2-9]{12}$'),
  constraint hosted_subscriptions_status_check check (
    status in ('active', 'past_due', 'canceled', 'unpaid', 'incomplete', 'trialing', 'unknown')
  ),
  constraint hosted_subscriptions_lifecycle_status_check check (
    lifecycle_status in ('ACTIVE', 'PAST_DUE', 'CANCELLED_AT_PERIOD_END', 'EXPIRED', 'REACTIVATED', 'RETIRED_INTERNAL')
  ),
  constraint hosted_subscriptions_provisioning_status_check check (
    provisioning_status in ('ready_for_customer_setup', 'provisioning_failed')
  )
);

create index if not exists hosted_subscriptions_customer_id_idx
  on hosted_subscriptions(customer_id);
create index if not exists hosted_subscriptions_stripe_subscription_id_idx
  on hosted_subscriptions(stripe_subscription_id);

create index if not exists hosted_subscriptions_business_id_idx
  on hosted_subscriptions(business_id);

create index if not exists hosted_subscriptions_lifecycle_status_idx
  on hosted_subscriptions(lifecycle_status);

create table if not exists billing_invoices (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete set null,
  order_id uuid references orders(id) on delete set null,
  hosted_subscription_id uuid references hosted_subscriptions(id) on delete set null,
  email text not null,
  stripe_customer_id text,
  stripe_invoice_id text unique,
  stripe_checkout_session_id text,
  stripe_subscription_id text,
  stripe_payment_intent_id text,
  invoice_number text,
  status text,
  payment_status text,
  payment_method_label text,
  hosted_invoice_url text,
  invoice_pdf_url text,
  receipt_url text,
  subtotal_cents integer not null default 0 check (subtotal_cents >= 0),
  tax_cents integer not null default 0 check (tax_cents >= 0),
  shipping_cents integer not null default 0 check (shipping_cents >= 0),
  total_cents integer not null default 0 check (total_cents >= 0),
  amount_paid_cents integer not null default 0 check (amount_paid_cents >= 0),
  currency text not null default 'usd',
  issued_at timestamptz,
  paid_at timestamptz,
  period_start timestamptz,
  period_end timestamptz,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists billing_invoices_customer_id_idx on billing_invoices(customer_id);
create index if not exists billing_invoices_email_created_at_idx on billing_invoices(email, created_at desc);
create index if not exists billing_invoices_order_id_idx on billing_invoices(order_id);
create index if not exists billing_invoices_subscription_id_idx on billing_invoices(stripe_subscription_id);

create table if not exists billing_invoice_items (
  id uuid primary key default gen_random_uuid(),
  billing_invoice_id uuid not null references billing_invoices(id) on delete cascade,
  order_id uuid references orders(id) on delete set null,
  hosted_subscription_id uuid references hosted_subscriptions(id) on delete set null,
  line_item_index integer not null default 0,
  title text not null,
  option_label text,
  quantity integer not null default 1 check (quantity > 0),
  amount_cents integer not null default 0,
  recurring_amount_cents integer not null default 0,
  hosted_page_url text,
  metadata_json jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (billing_invoice_id, line_item_index)
);

create index if not exists billing_invoice_items_invoice_id_idx on billing_invoice_items(billing_invoice_id);
create index if not exists billing_invoice_items_hosted_subscription_id_idx on billing_invoice_items(hosted_subscription_id);

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
