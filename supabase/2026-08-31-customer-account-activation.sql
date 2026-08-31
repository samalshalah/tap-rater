alter table customers add column if not exists password_hash text;
alter table customers add column if not exists account_status text not null default 'pending_activation';
alter table customers add column if not exists activation_token_hash text;
alter table customers add column if not exists activation_expires_at timestamptz;
alter table customers add column if not exists activated_at timestamptz;

alter table customers drop constraint if exists customers_account_status_check;
alter table customers add constraint customers_account_status_check
  check (account_status in ('pending_activation', 'active', 'disabled'));

create index if not exists customers_activation_token_hash_idx
  on customers(activation_token_hash)
  where activation_token_hash is not null;
