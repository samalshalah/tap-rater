alter table products add column if not exists sort_order integer not null default 1000;

create index if not exists products_active_sort_idx on products(is_active, sort_order, title);
