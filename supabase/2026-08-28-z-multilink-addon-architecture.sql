alter table products add column if not exists supports_multilink boolean not null default false;

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

update stand_types
set
  title = 'Website & Link Stands',
  description = 'Stands that open one website, link hub, information page, or custom URL.',
  short_description = 'Open one direct website or link.',
  long_content = 'Website and link stands open one direct destination URL. Multi-Link is an optional hosted service add-on for compatible products.',
  seo_title = 'Website and Link NFC Stands | Tap Rater',
  seo_description = 'Shop NFC and QR website link stands that open one direct website, link hub, information page, or custom URL.',
  updated_at = now()
where slug = 'website-link-stands';

update products
set
  slug = 'visit-our-website-stand',
  title = 'Visit Our Website Stand',
  sku = 'TR-WEBSITE-STAND',
  category_slug = 'website-links',
  stand_type_slug = 'website-link-stands',
  destination_type = 'website',
  product_kind = 'normal_direct',
  product_type = 'physical_redirect',
  service_mode = 'basic_redirect',
  checkout_mode = 'buy_now',
  requires_account = false,
  requires_subscription = false,
  requires_landing_page = false,
  supports_multilink = true,
  base_price_cents = 3900,
  short_description = 'Countertop NFC and QR stand that opens one website, link hub, information page, or custom URL.',
  description = 'Visit Our Website Stand is a tabletop NFC and QR display for sending customers directly to one website, link hub, information page, or custom URL.',
  images = '[{"src":"/uploads/products/visit-website-stand.png","alt":"Tap Rater Visit Our Website Stand"}]'::jsonb,
  seo_title = 'Visit Our Website Stand | NFC and QR Website Link Stand',
  seo_description = 'Buy a website link NFC and QR stand that opens one direct website, link hub, information page, or custom URL.',
  search_keywords = array['website nfc stand', 'website qr stand', 'visit our website stand', 'link stand']::text[],
  updated_at = now()
where slug = 'multi-link-stand'
  and not exists (select 1 from products where slug = 'visit-our-website-stand');

update products
set
  status = 'archived',
  is_active = false,
  stock_status = 'outofstock',
  updated_at = now()
where slug = 'multi-link-stand';

update products
set supports_multilink = slug in (
  'follow-us-social-media-stand',
  'rate-your-experience-stand',
  'visit-our-website-stand',
  'custom-direct-stand'
)
where slug in (
  'follow-us-social-media-stand',
  'rate-your-experience-stand',
  'visit-our-website-stand',
  'custom-direct-stand',
  'google-review-stand',
  'yelp-review-stand',
  'dealerrater-review-stand'
);

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

delete from product_service_addons
where service_addon_code = 'hosted_multilink'
  and product_slug in ('google-review-stand', 'yelp-review-stand', 'dealerrater-review-stand', 'multi-link-stand');

update product_options
set is_active = false, updated_at = now()
where option_code = 'hosted_multilink';
