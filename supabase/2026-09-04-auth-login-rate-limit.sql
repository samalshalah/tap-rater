create table if not exists auth_login_attempts (
  id uuid primary key default gen_random_uuid(),
  scope text not null check (scope in ('admin', 'customer')),
  identifier_hash text not null,
  ip_hash text,
  success boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists auth_login_attempts_identifier_created_at_idx
  on auth_login_attempts(scope, identifier_hash, created_at desc);

create index if not exists auth_login_attempts_ip_created_at_idx
  on auth_login_attempts(scope, ip_hash, created_at desc)
  where ip_hash is not null;
