begin;

create extension if not exists pgcrypto;

alter table products add column if not exists stand_type_slug text;
alter table products add column if not exists primary_platform_slug text;
alter table products add column if not exists destination_type text;
alter table products add column if not exists is_special_solution boolean;
alter table products add column if not exists product_kind text;
alter table products add column if not exists status text;
alter table products add column if not exists format text;
alter table products add column if not exists images jsonb;
alter table products add column if not exists standard_angled_image_url text;
alter table products add column if not exists branded_angled_image_url text;
alter table products add column if not exists multilink_angled_image_url text;
alter table products add column if not exists standard_front_template_url text;
alter table products add column if not exists branded_front_template_url text;
alter table products add column if not exists multilink_front_template_url text;
alter table products add column if not exists center_asset_url text;
alter table products add column if not exists default_cta_text text;
alter table products add column if not exists cta_editable boolean;
alter table products add column if not exists landing_page_preview_config jsonb;
alter table products add column if not exists asset_readiness_status text;

alter table products alter column is_special_solution set default false;
alter table products alter column product_kind set default 'normal_direct';
alter table products alter column status set default 'draft';
alter table products alter column format set default 'stand';
alter table products alter column images set default '[]'::jsonb;
alter table products alter column customization_options set default array['standard_design', 'add_logo']::text[];
alter table products alter column allows_custom_design set default false;
alter table products alter column cta_editable set default false;
alter table products alter column landing_page_preview_config set default '{}'::jsonb;
alter table products alter column asset_readiness_status set default 'draft_missing_assets';
alter table products alter column is_active set default false;

update products set is_special_solution = false where is_special_solution is null;
update products set product_kind = 'normal_direct' where product_kind is null or product_kind not in ('normal_direct', 'custom_direct', 'hosted_multilink', 'bundle');
update products set status = case when is_active then 'active' else 'draft' end where status is null or status not in ('draft', 'active', 'archived');
update products set status = 'active' where is_active = true and status = 'draft';
update products set format = 'stand' where format is null or format not in ('stand', 'plate', 'bundle', 'platform');
update products set images = '[]'::jsonb where images is null;
update products set cta_editable = false where cta_editable is null;
update products set landing_page_preview_config = '{}'::jsonb where landing_page_preview_config is null;
update products set asset_readiness_status = 'draft_missing_assets' where asset_readiness_status is null or asset_readiness_status not in ('draft_missing_assets', 'ready', 'blocked');
update products set destination_type = null where destination_type is not null and destination_type not in (
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
);

update products
set product_kind = 'custom_direct'
where slug = 'custom-direct-stand'
   or category_slug = 'custom-stands';

update products
set
  product_kind = 'hosted_multilink',
  is_special_solution = true,
  product_type = 'platform_landing_page',
  service_mode = 'hosted_landing_page',
  checkout_mode = 'subscription',
  requires_account = true,
  requires_subscription = true,
  requires_landing_page = true
where slug ilike '%hosted%'
   or slug ilike '%multi-link%'
   or coalesce(requires_subscription, false) = true
   or coalesce(requires_landing_page, false) = true
   or checkout_mode = 'subscription';

update products
set supported_destinations = case
  when cardinality(array(
    select distinct destination
    from unnest(coalesce(supported_destinations, array[]::text[])) as destination
    where destination = any(array[
      'google',
      'facebook',
      'yelp',
      'tripadvisor',
      'trustpilot',
      'bbb',
      'nextdoor',
      'instagram',
      'tiktok',
      'linkedin',
      'x',
      'youtube',
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
    ]::text[])
  )) = 0
    then array['custom']::text[]
  else array(
    select distinct destination
    from unnest(coalesce(supported_destinations, array[]::text[])) as destination
    where destination = any(array[
      'google',
      'facebook',
      'yelp',
      'tripadvisor',
      'trustpilot',
      'bbb',
      'nextdoor',
      'instagram',
      'tiktok',
      'linkedin',
      'x',
      'youtube',
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
    ]::text[])
  )
end
where supported_destinations is null
   or not (supported_destinations <@ array[
      'google',
      'facebook',
      'yelp',
      'tripadvisor',
      'trustpilot',
      'bbb',
      'nextdoor',
      'instagram',
      'tiktok',
      'linkedin',
      'x',
      'youtube',
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
    ]::text[]);

update products
set customization_options = case
  when cardinality(array(
    select distinct customization_option
    from unnest(coalesce(customization_options, array[]::text[])) as customization_option
    where customization_option = any(array['standard_design', 'add_logo', 'custom_design']::text[])
  )) = 0
    then array['standard_design', 'add_logo']::text[]
  else array(
    select distinct customization_option
    from unnest(coalesce(customization_options, array[]::text[])) as customization_option
    where customization_option = any(array['standard_design', 'add_logo', 'custom_design']::text[])
  )
end
where customization_options is null
   or not customization_options <@ array['standard_design', 'add_logo', 'custom_design']::text[];

alter table products alter column is_special_solution set not null;
alter table products alter column product_kind set not null;
alter table products alter column status set not null;
alter table products alter column format set not null;
alter table products alter column images set not null;
alter table products alter column cta_editable set not null;
alter table products alter column landing_page_preview_config set not null;
alter table products alter column asset_readiness_status set not null;

alter table products drop constraint if exists products_service_mode_check;
alter table products drop constraint if exists products_format_check;
alter table products drop constraint if exists products_product_kind_check;
alter table products drop constraint if exists products_status_check;
alter table products drop constraint if exists products_asset_readiness_status_check;
alter table products drop constraint if exists products_destination_type_check;
alter table products drop constraint if exists products_supported_destinations_check;
alter table products drop constraint if exists products_customization_options_check;
alter table products drop constraint if exists products_design_mode_check;

alter table products add constraint products_service_mode_check check (service_mode in ('basic_redirect', 'managed_redirect', 'hosted_landing_page', 'multi_location_platform'));
alter table products add constraint products_format_check check (format in ('stand', 'plate', 'bundle', 'platform'));
alter table products add constraint products_product_kind_check check (product_kind in ('normal_direct', 'custom_direct', 'hosted_multilink', 'bundle'));
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
alter table products add constraint products_supported_destinations_check check (
  supported_destinations <@ array[
    'google',
    'facebook',
    'yelp',
    'tripadvisor',
    'trustpilot',
    'bbb',
    'nextdoor',
    'dealerrater',
    'autotrader',
    'carfax',
    'edmunds',
    'cars',
    'cargurus',
    'repairpal',
    'surecritic',
    'instagram',
    'tiktok',
    'linkedin',
    'x',
    'youtube',
    'snapchat',
    'pinterest',
    'airbnb',
    'agoda',
    'vrbo',
    'hotels',
    'healthgrades',
    'vitals',
    'ratemds',
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
alter table products add constraint products_customization_options_check check (
  customization_options <@ array['standard_design', 'add_logo', 'custom_design']::text[]
);
alter table products add constraint products_design_mode_check check (design_mode in ('standard', 'logo', 'custom'));

create table if not exists stand_types (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  image_url text,
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
  image_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
  option_code text not null,
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
  option_code text primary key,
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
create unique index if not exists product_options_product_slug_option_code_unique_idx
  on product_options(product_slug, option_code);

alter table product_option_templates add column if not exists max_links integer;
alter table product_option_templates add column if not exists supports_reorderable_links boolean not null default false;
alter table product_option_templates add column if not exists supports_link_visibility boolean not null default false;
alter table product_option_templates add column if not exists landing_page_url_pattern text;
alter table product_option_templates add column if not exists footer_label text;
alter table product_option_templates drop constraint if exists product_option_templates_option_code_check;
alter table product_option_templates add constraint product_option_templates_option_code_check check (option_code in ('standard_direct', 'branded_qr_direct', 'hosted_multilink'));
alter table product_option_templates drop constraint if exists product_option_templates_max_links_check;
alter table product_option_templates add constraint product_option_templates_max_links_check check (max_links is null or max_links > 0);
create unique index if not exists product_option_templates_option_code_unique_idx
  on product_option_templates(option_code);

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
create index if not exists platforms_active_destination_sort_idx on platforms(is_active, destination_type, title);
create index if not exists product_business_uses_business_use_idx on product_business_uses(business_use_slug);
create index if not exists product_options_product_active_sort_idx on product_options(product_slug, is_active, sort_order);
create index if not exists products_stand_type_idx on products(stand_type_slug);
create index if not exists products_primary_platform_idx on products(primary_platform_slug);
create index if not exists products_status_idx on products(status);

insert into stand_types (slug, title, description, image_url, sort_order, is_active)
values
  ('review-stands', 'Review Stands', 'Stands that send customers to a review destination.', '/uploads/products/google-review-stand.png', 10, true),
  ('social-media-stands', 'Social Media Stands', 'Stands that open social profiles or follow links.', '/uploads/products/social-media-stand.png', 20, true),
  ('appointment-reservation-stands', 'Appointment & Reservation Stands', 'Stands that open booking, scheduling, reservation, or service links.', '/uploads/products/book-next-visit-stand.png', 30, true),
  ('feedback-survey-stands', 'Feedback & Survey Stands', 'Stands that collect private feedback or survey responses.', '/uploads/products/rate-your-experience-stand.png', 40, true),
  ('menu-info-stands', 'Menu & Info Stands', 'Stands that open menus, services, pricing, or information pages.', '/uploads/products/view-menu-stand.png', 50, true),
  ('website-link-stands', 'Website & Link Stands', 'Stands that open websites, catalogs, apps, locations, or custom direct URLs.', '/uploads/products/no-photo-available.png', 60, true),
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
  ('linkedin', 'LinkedIn', 'social', null, false, true, true),
  ('x', 'X', 'social', null, false, true, true),
  ('youtube', 'YouTube', 'social', null, false, true, true),
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
  ('hosted_multilink', 'Hosted Multi-Link', 'Branded NFC and QR stand connected to a hosted Tap Rater multi-link landing page.', 4900, 990, 10, false, true, true, true, true, true, true, true, true, true, '/l/:client-name', 'Powered by Tap Rater', 30, true)
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

commit;
