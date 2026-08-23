begin;

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

update product_option_templates
set landing_page_url_pattern = 'https://taprater.com/p/{code}'
where option_code = 'hosted_multilink';

update product_options
set landing_page_url_pattern = 'https://taprater.com/p/{code}'
where option_code = 'hosted_multilink';

commit;

