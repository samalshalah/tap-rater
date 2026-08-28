alter table products
  add column if not exists search_keywords text[] not null default '{}',
  add column if not exists size_options jsonb not null default '[]'::jsonb,
  add column if not exists color_options jsonb not null default '[]'::jsonb,
  add column if not exists key_features jsonb not null default '[]'::jsonb,
  add column if not exists how_it_works jsonb not null default '[]'::jsonb,
  add column if not exists specifications jsonb not null default '[]'::jsonb,
  add column if not exists included_items jsonb not null default '[]'::jsonb,
  add column if not exists product_faqs jsonb not null default '[]'::jsonb;
