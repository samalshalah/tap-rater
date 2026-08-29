update products
set
  product_kind = 'normal_direct',
  product_type = 'physical_redirect',
  service_mode = 'basic_redirect',
  checkout_mode = 'buy_now',
  requires_account = false,
  requires_subscription = false,
  requires_landing_page = false,
  updated_at = now()
where product_kind = 'hosted_multilink';

alter table products drop constraint if exists products_product_kind_check;
alter table products add constraint products_product_kind_check check (product_kind in ('normal_direct', 'custom_direct', 'bundle'));
