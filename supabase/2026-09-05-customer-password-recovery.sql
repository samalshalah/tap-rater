begin;

alter table customers add column if not exists password_reset_token_hash text;
alter table customers add column if not exists password_reset_expires_at timestamptz;
alter table customers add column if not exists sessions_invalid_before timestamptz;

create unique index if not exists customers_password_reset_token_hash_idx
  on customers(password_reset_token_hash) where password_reset_token_hash is not null;

alter table auth_login_attempts drop constraint if exists auth_login_attempts_scope_check;
alter table auth_login_attempts add constraint auth_login_attempts_scope_check
  check (scope in ('admin', 'customer', 'customer_recovery'));

commit;
