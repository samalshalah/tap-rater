alter table contact_requests
  add column if not exists admin_notes text not null default '',
  add column if not exists resolved_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table setup_requests
  add column if not exists admin_notes text not null default '',
  add column if not exists resolved_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

alter table change_link_requests
  add column if not exists admin_notes text not null default '',
  add column if not exists resolved_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

create index if not exists contact_requests_status_updated_at_idx
  on contact_requests(status, updated_at desc);

create index if not exists setup_requests_status_updated_at_idx
  on setup_requests(status, updated_at desc);

create index if not exists change_link_requests_status_updated_at_idx
  on change_link_requests(status, updated_at desc);
