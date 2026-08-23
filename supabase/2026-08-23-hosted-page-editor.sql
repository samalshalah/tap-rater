begin;

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

commit;
